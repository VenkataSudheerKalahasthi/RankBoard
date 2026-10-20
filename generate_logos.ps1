Add-Type -AssemblyName PresentationCore, PresentationFramework, WindowsBase, System.Xaml

$csharp = @"
using System;
using System.IO;
using System.Windows;
using System.Windows.Media;
using System.Windows.Media.Imaging;

public class LogoGenerator {
    public static void GenerateLeetCode(string outputPath, int size, bool isJpeg) {
        var visual = new DrawingVisual();
        using (var dc = visual.RenderOpen()) {
            // Pure White background
            dc.DrawRectangle(Brushes.White, null, new Rect(0, 0, size, size));

            // LeetCode official vector path (viewBox 0 0 94 111)
            double pad = size * 0.16;
            double drawSize = size - (pad * 2.0);
            double scale = drawSize / 111.0;
            double offsetX = (size - 94.0 * scale) / 2.0;
            double offsetY = (size - 111.0 * scale) / 2.0;

            var transform = new TransformGroup();
            transform.Children.Add(new ScaleTransform(scale, scale));
            transform.Children.Add(new TranslateTransform(offsetX, offsetY));
            dc.PushTransform(transform);

            // Path 3: Bottom orange loop (#FFA116)
            var p3 = Geometry.Parse("M67.5068339,83.0664138 C70.0005384,80.5763786 74.0371402,80.5828822 76.5228362,83.0809398 C79.0085322,85.5789975 79.00204,89.6226456 76.5083355,92.1126808 L65.4351451,103.169577 C55.2192332,113.370744 38.5604663,113.518673 28.1722578,103.513204 C28.112217,103.455678 23.486583,98.9201326 8.22702585,83.9570195 C-1.92478479,74.0028895 -2.93614945,58.0748736 6.61697549,47.8463644 L24.4286944,28.7745461 C33.9100043,18.6218594 51.3874487,17.5122246 62.2279907,26.2789232 L78.4052912,39.3620235 C81.1448956,41.5776292 81.5728103,45.5984975 79.3610655,48.3428842 C77.1493207,51.0872709 73.1354592,51.5159327 70.3958548,49.300327 L54.2186634,36.2173149 C48.5492813,31.6325105 38.631911,32.2621597 33.7398535,37.5006265 L15.9279056,56.5726899 C11.2772073,61.552182 11.7865613,69.5740156 17.1461283,74.8292186 C28.3515339,85.8169393 36.9874071,94.2846214 36.9973988,94.294225 C42.3981571,99.4959838 51.130862,99.418438 56.43358,94.1233737 L67.5068339,83.0664138 Z");
            var orangeBrush = new SolidColorBrush(Color.FromRgb(255, 161, 22));
            dc.DrawGeometry(orangeBrush, null, p3);

            // Path 2: Middle grey bar (#A6A6A6)
            var p2 = Geometry.Parse("M40.6069914,72.0014117 C37.086019,72.0014117 34.2317068,69.142117 34.2317068,65.6149982 C34.2317068,62.0878794 37.086019,59.2285847 40.6069914,59.2285847 L87.6247154,59.2285847 C91.1456879,59.2285847 94,62.0878794 94,65.6149982 C94,69.142117 91.1456879,72.0014117 87.6247154,72.0014117 L40.6069914,72.0014117 Z");
            var greyBrush = new SolidColorBrush(Color.FromRgb(166, 166, 166));
            dc.DrawGeometry(greyBrush, null, p2);

            // Path 1: Upper dark hook (#262626)
            var p1 = Geometry.Parse("M49.4124315,2.02335002 C51.8178981,-0.552320454 55.852269,-0.686893945 58.4234511,1.72277172 C60.9946333,4.13243738 61.1289722,8.17385083 58.7235056,10.7495213 L15.9282277,56.5728697 C11.2773659,61.551984 11.7867168,69.5737689 17.1459309,74.8291832 L36.9094236,94.2091099 C39.4255514,96.6764051 39.4686234,100.719828 37.0056277,103.240348 C34.5426319,105.760868 30.5062548,105.804016 27.990127,103.33672 L8.22654289,83.9567041 C-1.92467414,74.0021005 -2.93603527,58.0741402 6.61751533,47.846311 L49.4124315,2.02335002 Z");
            var darkBrush = new SolidColorBrush(Color.FromRgb(38, 38, 38));
            dc.DrawGeometry(darkBrush, null, p1);

            dc.Pop();
        }

        SaveBitmap(visual, outputPath, size, isJpeg);
    }

    public static void GenerateHackerRank(string outputPath, int size, bool isJpeg) {
        var visual = new DrawingVisual();
        using (var dc = visual.RenderOpen()) {
            // Pure White background
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

        SaveBitmap(visual, outputPath, size, isJpeg);
    }

    private static void SaveBitmap(DrawingVisual visual, string outputPath, int size, bool isJpeg) {
        var rtb = new RenderTargetBitmap(size, size, 96, 96, PixelFormats.Pbgra32);
        rtb.Render(visual);

        BitmapEncoder encoder;
        if (isJpeg) {
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

Add-Type -TypeDefinition $csharp -ReferencedAssemblies PresentationCore, PresentationFramework, WindowsBase, System.Xaml

$destDirs = @(
    "d:\rankboard\client\public\logos",
    "d:\rankboard\client\src\assets\logos"
)

foreach ($dir in $destDirs) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force
    }

    Write-Output "Generating logos in $dir..."
    [LogoGenerator]::GenerateLeetCode("$dir\leetcode.jpg", 300, $true)
    [LogoGenerator]::GenerateLeetCode("$dir\leetcode.png", 300, $false)
    [LogoGenerator]::GenerateHackerRank("$dir\hackerrank.jpg", 300, $true)
    [LogoGenerator]::GenerateHackerRank("$dir\hackerrank.png", 300, $false)
}

Write-Output "ALL_LOGOS_GENERATED_SUCCESSFULLY"
