import fs from "fs";
import path from "path";
import sharp from "sharp";

async function optimizeImages() {
	console.log("🖼️  Optimizing Images...\n");

	const imageDir = "./public";
	const outputDir = "./public/optimized";

	// Create output directory if it doesn't exist
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}

	// Get file sizes before optimization
	const getFileSize = (filePath) => {
		try {
			const stats = fs.statSync(filePath);
			return (stats.size / 1024).toFixed(2); // KB
		} catch (error) {
			return 0;
		}
	};

	const platformImages = [
		"Platforms/trakt.png",
		"Platforms/retroachievements.png",
		"Platforms/lastfm.png",
		"Platforms/gameboy-color.png",
		"Platforms/gameboy-advance.png",
		"Platforms/nintendo-ds.png",
		"Platforms/playstation-2.png",
		"Platforms/playstation-4.png",
		"PSN_Trophies/PSN_bronze.png",
		"PSN_Trophies/PSN_silver.png",
		"PSN_Trophies/PSN_gold.png",
		"PSN_Trophies/PSN_platinum.png",
	];

	let totalOriginal = 0;
	let totalOptimized = 0;

	console.log("📊 Image Optimization Results:");
	console.log("----------------------------------------");

	for (const imagePath of platformImages) {
		const fullPath = path.join(imageDir, imagePath);
		const originalSize = getFileSize(fullPath);
		totalOriginal += parseFloat(originalSize);

		if (originalSize > 0) {
			try {
				// Optimize PNG images
				if (imagePath.endsWith(".png")) {
					const destinationDir = path.join(outputDir, path.dirname(imagePath));
					fs.mkdirSync(destinationDir, { recursive: true });

					await sharp(fullPath)
						.png({
							compressionLevel: 9,
							palette: true,
							quality: 80,
						})
						.toFile(path.join(outputDir, imagePath));
				}

				// Check optimized size
				const optimizedPath = path.join(outputDir, imagePath);
				const optimizedSize = getFileSize(optimizedPath);
				totalOptimized += parseFloat(optimizedSize);

				const savings = (
					((originalSize - optimizedSize) / originalSize) *
					100
				).toFixed(1);

				console.log(
					`✅ ${imagePath.padEnd(35)} ${originalSize.padStart(
						8
					)} KB → ${optimizedSize.padStart(8)} KB (${savings}% smaller)`
				);
			} catch (error) {
				console.log(`❌ ${imagePath}: ${error.message}`);
			}
		}
	}

	const totalSavings = (
		((totalOriginal - totalOptimized) / totalOriginal) *
		100
	).toFixed(1);
	console.log("----------------------------------------");
	console.log(`📈 Total Original Size: ${totalOriginal.toFixed(2)} KB`);
	console.log(`📉 Total Optimized Size: ${totalOptimized.toFixed(2)} KB`);
	console.log(
		`🎯 Total Savings: ${(totalOriginal - totalOptimized).toFixed(
			2
		)} KB (${totalSavings}%)`
	);

	console.log("\n💡 To use optimized images:");
	console.log("   1. Review the optimized versions in /public/optimized/");
	console.log("   2. Replace originals if quality looks good");
	console.log("   3. Run `npm run build` to see the size reduction");
}

optimizeImages().catch(console.error);
