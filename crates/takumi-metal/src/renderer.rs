//! GPU renderer using wgpu.
//!
//! Renders text buffers (from cosmic-text) to a wgpu surface.

use wgpu::{Device, Queue, Surface, SurfaceConfiguration, TextureFormat};

use cosmic_text::{Buffer, Color, SwashCache, FontSystem};

/// GPU rendering state.
pub struct GpuRenderer {
    pub device: Device,
    pub queue: Queue,
    pub surface_config: SurfaceConfiguration,
    pub format: TextureFormat,
    /// Pixel buffer for software rasterization (blitted to GPU texture).
    pub pixel_buffer: Vec<u8>,
    pub width: u32,
    pub height: u32,
}

impl GpuRenderer {
    /// Create a new GPU renderer.
    pub async fn new(
        surface: &Surface<'_>,
        adapter: &wgpu::Adapter,
        width: u32,
        height: u32,
    ) -> Self {
        let (device, queue) = adapter
            .request_device(&wgpu::DeviceDescriptor::default(), None)
            .await
            .expect("Failed to create device");

        let surface_caps = surface.get_capabilities(adapter);
        let format = surface_caps
            .formats
            .iter()
            .find(|f| f.is_srgb())
            .copied()
            .unwrap_or(surface_caps.formats[0]);

        let surface_config = SurfaceConfiguration {
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT | wgpu::TextureUsages::COPY_DST,
            format,
            width,
            height,
            present_mode: wgpu::PresentMode::Fifo,
            alpha_mode: surface_caps.alpha_modes[0],
            view_formats: vec![],
            desired_maximum_frame_latency: 2,
        };
        surface.configure(&device, &surface_config);

        let pixel_buffer = vec![255u8; (width * height * 4) as usize];

        Self {
            device,
            queue,
            surface_config,
            format,
            pixel_buffer,
            width,
            height,
        }
    }

    /// Resize the renderer.
    pub fn resize(&mut self, surface: &Surface, width: u32, height: u32) {
        self.width = width;
        self.height = height;
        self.surface_config.width = width;
        self.surface_config.height = height;
        surface.configure(&self.device, &self.surface_config);
        self.pixel_buffer = vec![255u8; (width * height * 4) as usize];
    }

    /// Clear the pixel buffer to white.
    pub fn clear(&mut self) {
        self.pixel_buffer.fill(255);
    }

    /// Draw a cosmic-text buffer at a given position.
    pub fn draw_buffer(
        &mut self,
        buffer: &Buffer,
        font_system: &mut FontSystem,
        swash_cache: &mut SwashCache,
        x_offset: i32,
        y_offset: i32,
        color: Color,
    ) {
        let width = self.width as i32;
        let height = self.height as i32;

        for run in buffer.layout_runs() {
            for glyph in run.glyphs.iter() {
                let physical = glyph.physical((0., 0.), 1.0);

                if let Some(image) = swash_cache.get_image(font_system, physical.cache_key) {
                    let gx = physical.x + x_offset + image.placement.left;
                    let gy = physical.y + y_offset - image.placement.top
                        + run.line_y as i32;

                    for iy in 0..image.placement.height as i32 {
                        for ix in 0..image.placement.width as i32 {
                            let px = gx + ix;
                            let py = gy + iy;
                            if px < 0 || px >= width || py < 0 || py >= height {
                                continue;
                            }

                            let idx = ((py * width + px) * 4) as usize;
                            let alpha = image.data[(iy * image.placement.width as i32 + ix) as usize];
                            let a = alpha as f32 / 255.0;
                            let inv_a = 1.0 - a;

                            self.pixel_buffer[idx] =
                                (color.r() as f32 * a + self.pixel_buffer[idx] as f32 * inv_a) as u8;
                            self.pixel_buffer[idx + 1] =
                                (color.g() as f32 * a + self.pixel_buffer[idx + 1] as f32 * inv_a) as u8;
                            self.pixel_buffer[idx + 2] =
                                (color.b() as f32 * a + self.pixel_buffer[idx + 2] as f32 * inv_a) as u8;
                            self.pixel_buffer[idx + 3] = 255;
                        }
                    }
                }
            }
        }
    }

    /// Blit the pixel buffer to the GPU surface.
    pub fn present(&self, surface: &Surface) {
        let output = surface.get_current_texture().expect("Failed to get surface texture");
        let view = output.texture.create_view(&wgpu::TextureViewDescriptor::default());

        self.queue.write_texture(
            wgpu::TexelCopyTextureInfo {
                texture: &output.texture,
                mip_level: 0,
                origin: wgpu::Origin3d::ZERO,
                aspect: wgpu::TextureAspect::All,
            },
            &self.pixel_buffer,
            wgpu::TexelCopyBufferLayout {
                offset: 0,
                bytes_per_row: Some(self.width * 4),
                rows_per_image: Some(self.height),
            },
            wgpu::Extent3d {
                width: self.width,
                height: self.height,
                depth_or_array_layers: 1,
            },
        );

        output.present();
    }
}
