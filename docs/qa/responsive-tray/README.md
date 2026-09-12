# Responsive tray QA

Date: 12 September 2026  
Branch: `fix/responsive-dynamic-tray`

These captures exercise the dynamic gameplay tray with the first five-cell line rotated vertically. The three-piece images cover the ordinary state; the eight-piece images cover post-cut overflow and the controlled scroll region.

| Layout | Captures reviewed |
| --- | --- |
| Desktop | `desktop-wide-3.png`, `desktop-wide-8.png`, `desktop-8.png` |
| Tablet portrait | `tablet-portrait-3.png`, `tablet-portrait-8.png`, `tablet-tall-8.png` |
| Phone portrait | `phone-portrait-3.png`, `phone-portrait-8.png`, `phone-small-8.png` |
| Phone landscape | `phone-landscape-3.png`, `phone-landscape-8.png`, `phone-landscape-small-8.png` |
| Unusual aspect | `unusual-8.png` |
| Home control removal | `home-phone.png` |

Reviewed results:

- vertical and irregular previews remain within their cards;
- extra rows remain inside the themed tray scrollport and the fade indicates more content;
- no resting card or painted preview enters the blade region;
- the complete katana ring, energy label, board, score and controls remain on-screen;
- the Home blade animation Play/Pause control is absent and the main Play button remains;
- no capture reported a page or console error.

The automated geometry run covers 22 target viewports with every count from 1 through 8, plus a defensive 12 pieces. The repository-wide capture script also regenerated and checked 126 screen/state images across its seven standard viewports with zero console errors; those generated files were reviewed without retaining animation-only binary churn. Captures use headless Chromium/SwiftShader. Physical-device touch feel and GPU performance remain release checks.
