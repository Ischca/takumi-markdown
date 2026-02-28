/**
 * ANSI escape code helpers for terminal rendering.
 * Zero dependencies - uses raw escape sequences.
 */

// Detection: should we use colors?
const isTTY = typeof process !== 'undefined' && process.stdout?.isTTY
const forceColor = typeof process !== 'undefined' && process.env?.['FORCE_COLOR']
const noColor = typeof process !== 'undefined' && process.env?.['NO_COLOR']

export const colorEnabled = forceColor ? true : noColor ? false : !!isTTY

function esc(code: string): string {
  return colorEnabled ? `\x1b[${code}m` : ''
}

// Reset
export const reset = (): string => esc('0')

// Text styles
export const bold = (s: string): string => `${esc('1')}${s}${esc('22')}`
export const dim = (s: string): string => `${esc('2')}${s}${esc('22')}`
export const italic = (s: string): string => `${esc('3')}${s}${esc('23')}`
export const underline = (s: string): string => `${esc('4')}${s}${esc('24')}`
export const strikethrough = (s: string): string => `${esc('9')}${s}${esc('29')}`
export const inverse = (s: string): string => `${esc('7')}${s}${esc('27')}`

// Foreground colors (basic)
export const black = (s: string): string => `${esc('30')}${s}${esc('39')}`
export const red = (s: string): string => `${esc('31')}${s}${esc('39')}`
export const green = (s: string): string => `${esc('32')}${s}${esc('39')}`
export const yellow = (s: string): string => `${esc('33')}${s}${esc('39')}`
export const blue = (s: string): string => `${esc('34')}${s}${esc('39')}`
export const magenta = (s: string): string => `${esc('35')}${s}${esc('39')}`
export const cyan = (s: string): string => `${esc('36')}${s}${esc('39')}`
export const white = (s: string): string => `${esc('37')}${s}${esc('39')}`

// Bright foreground colors
export const brightBlack = (s: string): string => `${esc('90')}${s}${esc('39')}`
export const brightRed = (s: string): string => `${esc('91')}${s}${esc('39')}`
export const brightGreen = (s: string): string => `${esc('92')}${s}${esc('39')}`
export const brightYellow = (s: string): string => `${esc('93')}${s}${esc('39')}`
export const brightBlue = (s: string): string => `${esc('94')}${s}${esc('39')}`
export const brightMagenta = (s: string): string => `${esc('95')}${s}${esc('39')}`
export const brightCyan = (s: string): string => `${esc('96')}${s}${esc('39')}`

// Background colors
export const bgBlack = (s: string): string => `${esc('40')}${s}${esc('49')}`
export const bgWhite = (s: string): string => `${esc('47')}${s}${esc('49')}`

// 256-color foreground
export const fg256 = (n: number, s: string): string =>
  `${colorEnabled ? `\x1b[38;5;${n}m` : ''}${s}${esc('39')}`

// Strip ANSI escape sequences from a string
// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;]*m/g
export function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, '')
}
