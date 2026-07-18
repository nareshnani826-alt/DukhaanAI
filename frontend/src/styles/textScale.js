// Central accessibility floor for inline font sizes.
// Kirana shopkeepers skew older; text below this size is hard to read on a
// budget phone. Never hardcode a fontSize below this value in page/component
// styles — import MIN_FONT_SIZE instead, so the whole app's minimum readable
// text size can be raised in one place instead of hunting through inline
// style objects screen by screen.
export const MIN_FONT_SIZE = 12
