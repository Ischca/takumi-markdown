//! Takumi Metal: GPU-rendered Markdown viewer.
//!
//! Uses wgpu (Metal backend on macOS) for pixel-perfect Japanese typography.
//!
//! Usage: takumi document.md

mod app;
mod renderer;
mod text;

use std::env;
use std::fs;
use std::process;

fn main() {
    let args: Vec<String> = env::args().collect();

    if args.len() < 2 || args[1] == "--help" || args[1] == "-h" {
        eprintln!("Usage: takumi <file.md>");
        eprintln!();
        eprintln!("GPU-rendered Markdown viewer with Japanese typography optimization.");
        eprintln!();
        eprintln!("Controls:");
        eprintln!("  j / Down    Scroll down");
        eprintln!("  k / Up      Scroll up");
        eprintln!("  PgDn / Space  Page down");
        eprintln!("  PgUp        Page up");
        eprintln!("  Home        Scroll to top");
        eprintln!("  End         Scroll to bottom");
        eprintln!("  q / Esc     Quit");
        if args.len() < 2 {
            process::exit(1);
        }
        return;
    }

    let path = &args[1];
    let markdown = match fs::read_to_string(path) {
        Ok(content) => content,
        Err(e) => {
            eprintln!("Error reading {path}: {e}");
            process::exit(1);
        }
    };

    app::run(&markdown);
}
