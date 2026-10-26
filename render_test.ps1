Add-Type -AssemblyName PresentationCore, PresentationFramework, WindowsBase, System.Xaml

$csharpSource = @"
using System;
using System.IO;
using System.Windows;
using System.Windows.Media;
using System.Windows.Media.Imaging;

public class LogoRenderer {
    public static void RenderLeetCode(string outputPath, int size) {
        var visual = new DrawingVisual();
        using (var dc = visual.RenderOpen()) {
            // Pure White background
            dc.DrawRectangle(Brushes.White, null, new Rect(0, 0, size, size));

            // ViewBox of LC is 1.5, 0.5, 21, 23 (width 21, height 23)
            double scale = (size * 0.70) / 23.0;
            double offsetX = (size - 21.0 * scale) / 2.0 - 1.5 * scale;
            double offsetY = (size - 23.0 * scale) / 2.0 - 0.5 * scale;

            var transform = new TransformGroup();
            transform.Children.Add(new ScaleTransform(scale, scale));
            transform.Children.Add(new TranslateTransform(offsetX, offsetY));
            dc.PushTransform(transform);

            // Path 1: Bottom loop (#FFA116)
            var p1 = Geometry.Parse("M16.102 17.93l-2.697 2.607c-.466.467-1.111.662-1.823.662s-1.357-.195-1.824-.662l-4.332-4.363c-.467-.467-.702-1.15-.702-1.863s.235-1.357.702-1.824l4.319-4.38c.467-.467 1.125-.649 1.837-.649s1.357.195 1.823.662l2.697 2.606c.514.515 1.365.497 1.9-.038.535-.536.553-1.387.039-1.901l-2.609-2.636a5.074 5.074 0 0 0-3.85-1.372c-1.547 0-3.037.603-4.148 1.714L3.088 10.95c-1.112 1.112-1.728 2.602-1.728 4.149 0 1.548.616 3.038 1.728 4.15l4.332 4.364c1.11 1.11 2.6 1.727 4.148 1.727 1.547 0 3.037-.617 4.148-1.727l2.697-2.608c.514-.514.496-1.365-.039-1.901-.535-.535-1.386-.552-1.9-.038z");
            var orangeBrush = new SolidColorBrush(Color.FromRgb(255, 161, 22));
            dc.DrawGeometry(orangeBrush, null, p1);

            // Path 2: Middle bar (#FFA116)
            var p2 = Geometry.Parse("M10.676 15.701h10.064c.696 0 1.26-.603 1.26-1.346s-.564-1.346-1.26-1.346H10.676c-.696 0-1.26.604-1.26 1.346s.564 1.346 1.26 1.346z");
            dc.DrawGeometry(orangeBrush, null, p2);

            // Path 3: Top hook (#262626)
            var p3 = Geometry.Parse("M16.102 1.452C15.129.474 13.828 0 12.526 0s-2.603.474-3.576 1.452L4.637 5.809c-.725.724-.725 1.899 0 2.623.725.725 1.9.725 2.624 0l4.313-4.357a1.956 1.956 0 0 1 2.705 0l4.354 4.357c.725.725 1.9.725 2.624 0 .725-.724.725-1.899 0-2.623L16.102 1.452z");
            var darkBrush = new SolidColorBrush(Color.FromRgb(38, 38, 38));
            dc.DrawGeometry(darkBrush, null, p3);

            dc.Pop();
        }

        SaveBitmap(visual, outputPath, size);
    }

    public static void RenderHackerRankTwoTone(string outputPath, int size) {
        var visual = new DrawingVisual();
        using (var dc = visual.RenderOpen()) {
            dc.DrawRectangle(Brushes.White, null, new Rect(0, 0, size, size));

            // The H mark: left bar + crossbar (dark #0E141E), right bar (green #00EA64)
            double markH = size * 0.65;
            double markW = size * 0.65;
            double x = (size - markW) / 2.0;
            double y = (size - markH) / 2.0;

            double barW = markW * 0.28;
            double rightBoxW = markW * 0.44;
            double gapW = markW - barW - rightBoxW;
            double crossbarH = markH * 0.22;
            double crossbarY = y + (markH - crossbarH) / 2.0;

            var darkBrush = new SolidColorBrush(Color.FromRgb(14, 20, 30));
            var greenBrush = new SolidColorBrush(Color.FromRgb(0, 234, 100));

            // Left vertical bar of H
            dc.DrawRectangle(darkBrush, null, new Rect(x, y, barW, markH));
            // Crossbar
            dc.DrawRectangle(darkBrush, null, new Rect(x + barW, crossbarY, gapW, crossbarH));
            // Right green rectangle
            dc.DrawRectangle(greenBrush, null, new Rect(x + markW - rightBoxW, y, rightBoxW, markH));
        }

        SaveBitmap(visual, outputPath, size);
    }

    public static void RenderHackerRankBadge(string outputPath, int size) {
        var visual = new DrawingVisual();
        using (var dc = visual.RenderOpen()) {
            dc.DrawRectangle(Brushes.White, null, new Rect(0, 0, size, size));

            // ViewBox 0 0 32 32
            double scale = (size * 0.78) / 32.0;
            double offsetX = (size - 32.0 * scale) / 2.0;
            double offsetY = (size - 32.0 * scale) / 2.0;

            var transform = new TransformGroup();
            transform.Children.Add(new ScaleTransform(scale, scale));
            transform.Children.Add(new TranslateTransform(offsetX, offsetY));
            dc.PushTransform(transform);

            var greenBrush = new SolidColorBrush(Color.FromRgb(0, 234, 100));
            dc.DrawRoundedRectangle(greenBrush, null, new Rect(0, 0, 32, 32), 7, 7);

            var hGeom = Geometry.Parse("M9 8h4v6.5h6V8h4v16h-4v-6.5h-6V24H9V8z");
            dc.DrawGeometry(Brushes.White, null, hGeom);

            dc.Pop();
        }

        SaveBitmap(visual, outputPath, size);
    }

    private static void SaveBitmap(DrawingVisual visual, string outputPath, int size) {
        var rtb = new RenderTargetBitmap(size, size, 96, 96, PixelFormats.Pbgra32);
        rtb.Render(visual);

        BitmapEncoder encoder;
        if (outputPath.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase) || outputPath.EndsWith(".jpeg", StringComparison.OrdinalIgnoreCase)) {
            var jpeg = new JpegBitmapEncoder();
            jpeg.QualityLevel = 100;
            encoder = jpeg;
        } else {
            encoder = new PngBitmapEncoder();
        }

        encoder.Frames.Add(BitmapFrame.Create(rtb));
        using (var fs = File.Open(outputPath, FileMode.Create, FileAccess.Write)) {
            encoder.Save(fs);
        }
    }
}
"@

Add-Type -TypeDefinition $csharpSource -ReferencedAssemblies PresentationCore, PresentationFramework, WindowsBase, System.Xaml

[LogoRenderer]::RenderLeetCode("d:\rankboard\client\public\logos\test_lc.jpg", 200)
[LogoRenderer]::RenderHackerRankTwoTone("d:\rankboard\client\public\logos\test_hr_twotone.jpg", 200)
[LogoRenderer]::RenderHackerRankBadge("d:\rankboard\client\public\logos\test_hr_badge.jpg", 200)
Write-Output "DONE_RENDERING"
