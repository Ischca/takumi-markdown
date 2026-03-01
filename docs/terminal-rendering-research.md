# ターミナル向けMarkdownレンダラー：アーキテクチャ調査

## 1. OSC（Operating System Command）の出自

### 標準化の歴史

- **1976年** ECMA-48がOSC（`ESC ]`）のフォーマットを定義。番号の割り当ては規定せず
- **1978年** DEC VT100がECMA-48を実装 → 事実上の標準に
- **1984年〜** xtermが大量のOSCコードを独自に追加（OSC 4, 52等）
- **現在** 新しいOSCコードはターミナル作者が提案 → 他のターミナルが追随する形で標準化

W3Cのような公式な標準化団体は存在しない。[XTerm Control Sequences](https://invisible-island.net/xterm/ctlseqs/ctlseqs.html) が非公式な「生きた仕様書」。

### OSC 66（Structured Document Protocol）

- **2025年1月** Kittyの作者Kovid Goyalが [GitHub Issue #8226](https://github.com/kovidgoyal/kitty/issues/8226) でRFCとして提案
- Kitty 0.40で実装。現時点でフル実装はKittyのみ
- foot、Ghostty、Neovim、mdfried等の開発者にレビューを依頼

### 主なOSCコードの系譜

| OSC | 用途 | 起源 |
|-----|------|------|
| 0, 1, 2 | ウィンドウタイトル設定 | xterm (1984〜) |
| 4 | 256色パレット設定 | xterm |
| 7 | カレントディレクトリ通知 | macOS Terminal.app → 広く採用 |
| 8 | ハイパーリンク | GNOME VTE (2017) |
| 9 | デスクトップ通知 | iTerm2 |
| 52 | クリップボード操作 | xterm |
| 133 | シェルインテグレーション | FinalTerm → iTerm2 → 広く採用 |
| 1337 | iTerm2独自拡張（画像等） | iTerm2 |
| 66 | 構造化ドキュメント | Kitty (2025) |

## 2. libghostty-vt + 自前レンダラの実現可能性

### 結論：実現可能。既に実績がある

Ghosttyのアーキテクチャは**VTエミュレーション**と**レンダリング**を意図的に分離している。

### Ghosttyの3スレッドモデル

```
┌───────────┐    ┌──────────────────┐    ┌──────────────┐
│ Main      │    │ I/O Thread       │    │ Renderer     │
│           │    │                  │    │ Thread       │
│ UIイベント │───→│ PTY通信          │───→│ GPU描画      │
│ キーバインド│    │ VTパース         │    │ フレームタイミング│
│           │    │ ターミナル状態管理 │    │              │
└───────────┘    └──────────────────┘    └──────────────┘
                  ↑ libghostty-vt        ↑ 差し替え可能
```

レンダラスレッドはターミナル状態を**読み取り専用**でアクセス。

### 実績のあるプロジェクト

| プロジェクト | VT | レンダラ | 言語 |
|---|---|---|---|
| Ghostty本体 | libghostty-vt | Metal/OpenGL | Zig |
| cmux | libghostty全体 | Ghosttyのレンダラ | Swift |
| **gpui-ghostty** | **libghostty-vt** | **GPUI（自前）** | **Rust** |
| **ghostty-web** | **libghostty-vt (WASM)** | **DOM/Canvas（自前）** | **TypeScript** |

### 自前レンダラの構成

```
┌─────────────────────────────────────────┐
│  takumi-terminal                         │
│                                          │
│  ┌──────────────┐  ┌──────────────────┐ │
│  │ libghostty-vt│  │ 自前レンダラ      │ │
│  │              │→ │                   │ │
│  │ VTパース     │  │ Manrope + BIZ UDP│ │
│  │ 状態管理     │  │ HarfBuzz (palt)  │ │
│  │ Kitty Proto  │  │ 可変フォントサイズ│ │
│  │ PTY通信      │  │ 縦のリズム制御   │ │
│  └──────────────┘  │ Metal/OpenGL     │ │
│                     └──────────────────┘ │
└─────────────────────────────────────────┘
```

libghostty-vtが提供するもの（そのまま使える）：
- VTエスケープシーケンスのパース（SIMD最適化済み）
- ターミナル状態（カーソル、スタイル、画面バッファ）
- Kitty Graphics / Keyboard Protocol
- RenderState API（ダーティ行の追跡、差分更新）

自前で作るもの：
- **フォント選択・読み込み**: Manrope + BIZ UDPGothic
- **テキストシェイピング**: HarfBuzz → `palt`/`halt`有効化
- **行間・文字間の制御**: セルサイズの自由な設定
- **可変フォントサイズ**: OSC 66の見出しを大きく描画
- **描画パイプライン**: Metal/OpenGL/WebGPU

### RenderState API（`terminal/render.zig`）

ダーティ行追跡による差分更新を効率的に行うための汎用APIが `src/terminal/` に配置されている（`src/renderer/` ではない）。これは複数のレンダラから使われることを意図した設計。

```
フレームごとの処理:
1. RenderState.update() で状態同期 + ダーティフラグ取得
2. ダーティ行のみ getLine() でセル配列を取得
3. 各セルの codepoint, style_id を読み取り
4. style_id → bold/italic/fg_color/bg_color を解決
5. テキストシェイピング → グリフ描画
6. カーソル描画
```

### 現実的な懸念

| 懸念 | 状況 |
|------|------|
| C APIの完成度 | 開発中。Zig APIは使えるが、C経由は不完全 |
| API安定性 | 「extremely not stable」（Mitchell本人） |
| 採用タイミング | 早期採用者を求めているフェーズ。API設計に影響を与えられる |
| 言語選択 | Zig（ネイティブ）、Rust（gpui-ghosttyパターン）、TS/WASM（ghostty-webパターン） |

### 参考リンク

- [Libghostty Is Coming -- Mitchell Hashimoto](https://mitchellh.com/writing/libghostty-is-coming)
- [ghostty-vt Zig Module PR #8840](https://github.com/ghostty-org/ghostty/pull/8840)
- [gpui-ghostty](https://github.com/Xuanwo/gpui-ghostty)
- [ghostty-web](https://github.com/coder/ghostty-web)
- [cmux](https://github.com/manaflow-ai/cmux)
- [Kitty OSC 66 RFC](https://github.com/kovidgoyal/kitty/issues/8226)
- [XTerm Control Sequences](https://invisible-island.net/xterm/ctlseqs/ctlseqs.html)
