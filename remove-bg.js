const Jimp = require('jimp');

async function removeBackground() {
    try {
        const image = await Jimp.read('./public/logo.png');

        // Define what constitutes the background (dark colors)
        const targetColor = { r: 0, g: 0, b: 0 };
        const tolerance = 50;

        // We will also keep track of the non-background pixels to crop later
        let minX = image.bitmap.width;
        let minY = image.bitmap.height;
        let maxX = 0;
        let maxY = 0;

        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
            const red = this.bitmap.data[idx + 0];
            const green = this.bitmap.data[idx + 1];
            const blue = this.bitmap.data[idx + 2];
            const alpha = this.bitmap.data[idx + 3];

            // If the pixel is close to black, make it transparent
            if (red < tolerance && green < tolerance && blue < tolerance) {
                this.bitmap.data[idx + 3] = 0; // Set alpha to 0
            } else {
                // Not background, keep track of bounding box
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        });

        // Crop the image to its bounding box
        if (minX <= maxX && minY <= maxY) {
            const width = maxX - minX + 1;
            const height = maxY - minY + 1;

            // Add a small padding (e.g. 10px) securely
            const padding = 10;
            const pMinX = Math.max(0, minX - padding);
            const pMinY = Math.max(0, minY - padding);
            const pMaxX = Math.min(image.bitmap.width - 1, maxX + padding);
            const pMaxY = Math.min(image.bitmap.height - 1, maxY + padding);

            const pWidth = pMaxX - pMinX + 1;
            const pHeight = pMaxY - pMinY + 1;

            image.crop(pMinX, pMinY, pWidth, pHeight);
        }

        await image.writeAsync('./public/logo.png');
        console.log('Background removed and image cropped successfully.');
    } catch (err) {
        console.error('Error processing image:', err);
    }
}

removeBackground();
