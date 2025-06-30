import fs from "fs";
import path from "path";

async function replaceWithOptimized() {
	console.log("🔄 Replacing images with optimized versions...\n");

	const optimizedDir = "./public/optimized";
	const publicDir = "./public";

	if (!fs.existsSync(optimizedDir)) {
		console.log(
			"❌ No optimized directory found. Run `npm run optimize-images` first."
		);
		return;
	}

	const imagesToReplace = [
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

	let replacedCount = 0;
	let totalSaved = 0;

	for (const imagePath of imagesToReplace) {
		const originalPath = path.join(publicDir, imagePath);
		const optimizedPath = path.join(optimizedDir, imagePath);

		if (fs.existsSync(optimizedPath)) {
			try {
				// Get file sizes
				const originalSize = fs.statSync(originalPath).size;
				const optimizedSize = fs.statSync(optimizedPath).size;
				const saved = originalSize - optimizedSize;

				// Replace original with optimized
				fs.copyFileSync(optimizedPath, originalPath);

				console.log(`✅ ${imagePath} - Saved ${(saved / 1024).toFixed(1)}KB`);
				replacedCount++;
				totalSaved += saved;
			} catch (error) {
				console.log(`❌ Error replacing ${imagePath}: ${error.message}`);
			}
		}
	}

	console.log(`\n🎯 Successfully replaced ${replacedCount} images`);
	console.log(`💾 Total space saved: ${(totalSaved / 1024).toFixed(1)}KB`);
	console.log("\n🧹 Cleaning up...");

	// Remove the optimized directory
	try {
		fs.rmSync(optimizedDir, { recursive: true, force: true });
		console.log("✅ Cleaned up temporary optimized directory");
	} catch (error) {
		console.log("⚠️  Could not clean up optimized directory");
	}

	console.log(
		"\n✨ Image optimization complete! Run `npm run build` to see the results."
	);
}

replaceWithOptimized().catch(console.error);
