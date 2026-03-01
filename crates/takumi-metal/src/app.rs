//! Application window and event loop.

use winit::{
    application::ApplicationHandler,
    event::{ElementState, KeyEvent, WindowEvent},
    event_loop::{ActiveEventLoop, EventLoop},
    keyboard::{Key, NamedKey},
    window::{Window, WindowAttributes, WindowId},
};

use cosmic_text::{Attrs, Buffer, Color, Family, Metrics, Shaping};

use takumi_core::parse;
use takumi_core::typography;
use takumi_layout::tree::*;
use takumi_layout::{layout, LayoutContext};

use crate::renderer::GpuRenderer;
use crate::text::FontConfig;

/// Scroll speed in pixels.
const SCROLL_STEP: f32 = 40.0;
const PAGE_SCROLL_LINES: f32 = 20.0;

/// Run the application with the given Markdown content.
pub fn run(markdown: &str) {
    let doc = parse::parse(markdown);
    let event_loop = EventLoop::new().expect("Failed to create event loop");
    let mut app = App::new(doc);
    event_loop.run_app(&mut app).expect("Event loop failed");
}

struct App {
    doc: takumi_core::ast::Document,
    window: Option<Window>,
    renderer: Option<GpuRenderer>,
    font_config: FontConfig,
    scroll_y: f32,
    content_height: f32,
}

impl App {
    fn new(doc: takumi_core::ast::Document) -> Self {
        Self {
            doc,
            window: None,
            renderer: None,
            font_config: FontConfig::new(),
            scroll_y: 0.0,
            content_height: 0.0,
        }
    }

    fn render_frame(&mut self) {
        let Some(window) = &self.window else { return };
        let Some(renderer) = &mut self.renderer else {
            return;
        };

        let size = window.inner_size();
        if size.width == 0 || size.height == 0 {
            return;
        }

        // Compute layout
        let ctx = LayoutContext::new(size.width as f64);
        let tree = layout(&self.doc, &ctx);

        // Clear to white
        renderer.clear();

        let font_size = ctx.base_font_size_px as f32;
        let max_width = ctx.max_width_px as f32;
        let padding = 16.0f32;
        let x_offset = ((size.width as f32 - max_width) / 2.0).max(padding) as i32;
        let mut y_cursor = padding - self.scroll_y;

        let colors = RenderColors {
            text: Color::rgb(0x1A, 0x1A, 0x1A),
            heading: Color::rgb(0x0D, 0x0D, 0x0D),
            muted: Color::rgb(0x59, 0x59, 0x59),
        };

        for node in &tree.root {
            y_cursor = render_layout_node(
                renderer,
                &mut self.font_config,
                node,
                x_offset,
                y_cursor,
                font_size,
                max_width,
                &colors,
            );
        }

        self.content_height = y_cursor + self.scroll_y;
    }
}

struct RenderColors {
    text: Color,
    heading: Color,
    muted: Color,
}

fn render_layout_node(
    renderer: &mut GpuRenderer,
    font_config: &mut FontConfig,
    node: &LayoutNode,
    x_offset: i32,
    y_cursor: f32,
    font_size: f32,
    max_width: f32,
    colors: &RenderColors,
) -> f32 {
    let rhythm = font_size * typography::RHYTHM_REM as f32;
    let mut y = y_cursor;

    match node {
        LayoutNode::Heading { level, children } => {
            let scale = typography::heading_scale(*level) as f32;
            let h_size = font_size * scale;
            let metrics =
                Metrics::new(h_size, h_size * typography::LINE_HEIGHT_HEADING as f32);
            let mut buffer = Buffer::new(&mut font_config.font_system, metrics);
            let text = collect_inline_text(children);
            let attrs = Attrs::new().family(Family::SansSerif);
            buffer.set_size(&mut font_config.font_system, Some(max_width), None);
            buffer.set_text(
                &mut font_config.font_system,
                &text,
                attrs,
                Shaping::Advanced,
            );
            buffer.shape_until_scroll(&mut font_config.font_system, false);

            if *level > 1 {
                y += rhythm * 2.0;
            }

            renderer.draw_buffer(
                &buffer,
                &mut font_config.font_system,
                &mut font_config.swash_cache,
                x_offset,
                y as i32,
                colors.heading,
            );

            let buffer_height = buffer_total_height(&buffer);
            y += buffer_height + rhythm;
        }
        LayoutNode::Paragraph { children } => {
            let metrics = Metrics::new(
                font_size,
                font_size * typography::LINE_HEIGHT_BODY as f32,
            );
            let mut buffer = Buffer::new(&mut font_config.font_system, metrics);
            let text = collect_inline_text(children);
            let attrs = Attrs::new().family(Family::SansSerif);
            buffer.set_size(&mut font_config.font_system, Some(max_width), None);
            buffer.set_text(
                &mut font_config.font_system,
                &text,
                attrs,
                Shaping::Advanced,
            );
            buffer.shape_until_scroll(&mut font_config.font_system, false);

            renderer.draw_buffer(
                &buffer,
                &mut font_config.font_system,
                &mut font_config.swash_cache,
                x_offset,
                y as i32,
                colors.text,
            );

            let buffer_height = buffer_total_height(&buffer);
            y += buffer_height + rhythm;
        }
        LayoutNode::CodeBlock { code, .. } => {
            let code_size = font_size * 0.875;
            let metrics = Metrics::new(code_size, code_size * 1.6);
            let mut buffer = Buffer::new(&mut font_config.font_system, metrics);
            let attrs = Attrs::new().family(Family::Monospace);
            buffer.set_size(
                &mut font_config.font_system,
                Some(max_width - 32.0),
                None,
            );
            buffer.set_text(
                &mut font_config.font_system,
                code,
                attrs,
                Shaping::Advanced,
            );
            buffer.shape_until_scroll(&mut font_config.font_system, false);

            // Draw code block background (light gray)
            let bg_height = buffer_total_height(&buffer) + 32.0;
            draw_rect(
                renderer,
                x_offset - 16,
                y as i32,
                (max_width + 32.0) as u32,
                bg_height as u32,
                [0xF6, 0xF8, 0xFA, 0xFF],
            );

            renderer.draw_buffer(
                &buffer,
                &mut font_config.font_system,
                &mut font_config.swash_cache,
                x_offset,
                (y + 16.0) as i32,
                colors.text,
            );

            y += bg_height + rhythm;
        }
        LayoutNode::BlockQuote { children } => {
            let indent = 24;
            for child in children {
                y = render_layout_node(
                    renderer,
                    font_config,
                    child,
                    x_offset + indent,
                    y,
                    font_size,
                    max_width - indent as f32,
                    &RenderColors {
                        text: colors.muted,
                        heading: colors.heading,
                        muted: colors.muted,
                    },
                );
            }
        }
        LayoutNode::List { items, .. } => {
            for item in items {
                for child in &item.children {
                    y = render_layout_node(
                        renderer,
                        font_config,
                        child,
                        x_offset + 24,
                        y,
                        font_size,
                        max_width - 24.0,
                        colors,
                    );
                }
            }
        }
        LayoutNode::ThematicBreak => {
            y += rhythm;
            draw_rect(
                renderer,
                x_offset,
                y as i32,
                max_width as u32,
                1,
                [0xC9, 0xCC, 0xD1, 0xFF],
            );
            y += rhythm;
        }
        _ => {
            y += rhythm;
        }
    }

    y
}

impl ApplicationHandler for App {
    fn resumed(&mut self, event_loop: &ActiveEventLoop) {
        let attrs = WindowAttributes::default()
            .with_title("Takumi")
            .with_inner_size(winit::dpi::LogicalSize::new(800, 600));
        let window = event_loop
            .create_window(attrs)
            .expect("Failed to create window");
        self.window = Some(window);
    }

    fn window_event(
        &mut self,
        event_loop: &ActiveEventLoop,
        _id: WindowId,
        event: WindowEvent,
    ) {
        match event {
            WindowEvent::CloseRequested => {
                event_loop.exit();
            }
            WindowEvent::KeyboardInput {
                event:
                    KeyEvent {
                        logical_key,
                        state: ElementState::Pressed,
                        ..
                    },
                ..
            } => match logical_key.as_ref() {
                Key::Named(NamedKey::Escape) | Key::Character("q") => {
                    event_loop.exit();
                }
                Key::Named(NamedKey::ArrowDown) | Key::Character("j") => {
                    self.scroll_y += SCROLL_STEP;
                    if let Some(w) = &self.window {
                        w.request_redraw();
                    }
                }
                Key::Named(NamedKey::ArrowUp) | Key::Character("k") => {
                    self.scroll_y = (self.scroll_y - SCROLL_STEP).max(0.0);
                    if let Some(w) = &self.window {
                        w.request_redraw();
                    }
                }
                Key::Named(NamedKey::PageDown) | Key::Named(NamedKey::Space) => {
                    self.scroll_y += SCROLL_STEP * PAGE_SCROLL_LINES;
                    if let Some(w) = &self.window {
                        w.request_redraw();
                    }
                }
                Key::Named(NamedKey::PageUp) => {
                    self.scroll_y =
                        (self.scroll_y - SCROLL_STEP * PAGE_SCROLL_LINES).max(0.0);
                    if let Some(w) = &self.window {
                        w.request_redraw();
                    }
                }
                Key::Named(NamedKey::Home) => {
                    self.scroll_y = 0.0;
                    if let Some(w) = &self.window {
                        w.request_redraw();
                    }
                }
                Key::Named(NamedKey::End) => {
                    self.scroll_y = self.content_height;
                    if let Some(w) = &self.window {
                        w.request_redraw();
                    }
                }
                _ => {}
            },
            WindowEvent::Resized(size) => {
                if size.width > 0 && size.height > 0 {
                    if let Some(w) = &self.window {
                        w.request_redraw();
                    }
                }
            }
            WindowEvent::RedrawRequested => {
                self.render_frame();
            }
            _ => {}
        }
    }
}

/// Collect all text from inline nodes into a plain string.
fn collect_inline_text(inlines: &[LayoutInline]) -> String {
    let mut out = String::new();
    for inline in inlines {
        match inline {
            LayoutInline::Text { text } => out.push_str(text),
            LayoutInline::Strong { children }
            | LayoutInline::Emphasis { children }
            | LayoutInline::Strikethrough { children } => {
                out.push_str(&collect_inline_text(children));
            }
            LayoutInline::Code { code } => out.push_str(code),
            LayoutInline::Link { children, .. } => {
                out.push_str(&collect_inline_text(children));
            }
            LayoutInline::Image { alt, .. } => {
                out.push('[');
                out.push_str(alt);
                out.push(']');
            }
            LayoutInline::Ruby { base, annotation } => {
                out.push_str(base);
                out.push('(');
                out.push_str(annotation);
                out.push(')');
            }
            LayoutInline::LineBreak => out.push('\n'),
            LayoutInline::HtmlInline { .. } => {}
        }
    }
    out
}

/// Calculate total height of a cosmic-text buffer.
fn buffer_total_height(buffer: &Buffer) -> f32 {
    buffer
        .layout_runs()
        .last()
        .map(|run| run.line_y + run.line_height)
        .unwrap_or(0.0)
}

/// Draw a filled rectangle into the pixel buffer.
fn draw_rect(renderer: &mut GpuRenderer, x: i32, y: i32, w: u32, h: u32, color: [u8; 4]) {
    let buf_w = renderer.width as i32;
    let buf_h = renderer.height as i32;

    for dy in 0..h as i32 {
        for dx in 0..w as i32 {
            let px = x + dx;
            let py = y + dy;
            if px >= 0 && px < buf_w && py >= 0 && py < buf_h {
                let idx = ((py * buf_w + px) * 4) as usize;
                renderer.pixel_buffer[idx] = color[0];
                renderer.pixel_buffer[idx + 1] = color[1];
                renderer.pixel_buffer[idx + 2] = color[2];
                renderer.pixel_buffer[idx + 3] = color[3];
            }
        }
    }
}
