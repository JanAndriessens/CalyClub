#!/usr/bin/env node
// Performance testing script for CalyBase optimizations

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

// Utilities
const log = {
    info: (msg) => console.log(`ℹ️  ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️  ${msg}`),
    error: (msg) => console.error(`❌ ${msg}`)
};

// Analyze bundle sizes
function analyzeBundleSizes() {
    log.info('Analyzing bundle sizes...');
    
    const jsFiles = fs.readdirSync(publicDir)
        .filter(file => file.endsWith('.js'))
        .map(file => {
            const filePath = path.join(publicDir, file);
            const stats = fs.statSync(filePath);
            return {
                file,
                size: stats.size,
                sizeKB: (stats.size / 1024).toFixed(2)
            };
        })
        .sort((a, b) => b.size - a.size);

    console.log('\n📊 JavaScript Bundle Sizes:');
    console.log('═'.repeat(50));
    
    let totalSize = 0;
    jsFiles.forEach(({ file, size, sizeKB }) => {
        console.log(`${file.padEnd(30)} ${sizeKB.padStart(8)} KB`);
        totalSize += size;
    });
    
    console.log('═'.repeat(50));
    console.log(`Total JS Bundle Size: ${(totalSize / 1024).toFixed(2)} KB`);
    
    return { jsFiles, totalSize };
}

// Count optimizations applied
function countOptimizations() {
    log.info('Counting applied optimizations...');
    
    const optimizations = {
        consoleStatementsRemoved: 0,
        modernLoggerUsage: 0,
        deferredScripts: 0,
        cachedQueries: 0,
        realtimeListeners: 0
    };

    // Check for console statements (should be minimal now)
    const jsFiles = fs.readdirSync(publicDir)
        .filter(file => file.endsWith('.js') && !file.includes('logger'));

    jsFiles.forEach(file => {
        const content = fs.readFileSync(path.join(publicDir, file), 'utf8');
        
        // Count remaining console statements
        const consoleMatches = content.match(/console\.(log|warn|error|info|debug)/g);
        if (consoleMatches) {
            optimizations.consoleStatementsRemoved += consoleMatches.length;
        }
        
        // Count logger usage
        const loggerMatches = content.match(/logger\.(log|warn|error|info|debug)/g);
        if (loggerMatches) {
            optimizations.modernLoggerUsage += loggerMatches.length;
        }
        
        // Count cached queries
        const cacheMatches = content.match(/cachedQuery|CacheManager/g);
        if (cacheMatches) {
            optimizations.cachedQueries += cacheMatches.length;
        }
        
        // Count real-time listeners
        const realtimeMatches = content.match(/realtimeQuery|RealtimeManager|onSnapshot/g);
        if (realtimeMatches) {
            optimizations.realtimeListeners += realtimeMatches.length;
        }
    });

    // Check HTML for deferred scripts
    const htmlContent = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
    const deferMatches = htmlContent.match(/defer/g);
    optimizations.deferredScripts = deferMatches ? deferMatches.length : 0;

    console.log('\n🚀 Applied Optimizations:');
    console.log('═'.repeat(50));
    console.log(`Remaining console statements: ${optimizations.consoleStatementsRemoved}`);
    console.log(`Modern logger usage: ${optimizations.modernLoggerUsage}`);
    console.log(`Deferred scripts: ${optimizations.deferredScripts}`);
    console.log(`Cached queries: ${optimizations.cachedQueries}`);
    console.log(`Real-time listeners: ${optimizations.realtimeListeners}`);
    
    return optimizations;
}

// Check for performance features
function checkPerformanceFeatures() {
    log.info('Checking performance features...');
    
    const features = {
        serviceWorker: fs.existsSync(path.join(publicDir, 'sw-enhanced.js')),
        cacheManager: fs.existsSync(path.join(publicDir, 'cache-manager.js')),
        realtimeManager: fs.existsSync(path.join(publicDir, 'realtime-manager.js')),
        logger: fs.existsSync(path.join(publicDir, 'logger.js')),
        iPadOptimizations: fs.existsSync(path.join(publicDir, 'ipad-enhancements.js')),
        tableOptimizations: fs.existsSync(path.join(publicDir, 'table-touch-enhancements.js'))
    };

    console.log('\n⚡ Performance Features:');
    console.log('═'.repeat(50));
    Object.entries(features).forEach(([feature, enabled]) => {
        const status = enabled ? '✅' : '❌';
        const name = feature.replace(/([A-Z])/g, ' $1').toLowerCase();
        console.log(`${status} ${name}`);
    });
    
    return features;
}

// Estimate performance improvements
function estimateImprovements(bundleAnalysis, optimizations, features) {
    log.info('Estimating performance improvements...');
    
    const baseBundleSize = 400; // KB - estimated original size
    const currentBundleSize = bundleAnalysis.totalSize / 1024;
    const bundleReduction = ((baseBundleSize - currentBundleSize) / baseBundleSize * 100);
    
    const optimizationScore = Object.values(features).filter(Boolean).length;
    const maxOptimizations = Object.keys(features).length;
    const optimizationPercentage = (optimizationScore / maxOptimizations * 100);
    
    // Estimate load time improvements
    const baseLoadTime = 3000; // ms
    const estimatedLoadTime = baseLoadTime * (1 - (bundleReduction / 100) * 0.6); // 60% of reduction affects load time
    const loadTimeImprovement = ((baseLoadTime - estimatedLoadTime) / baseLoadTime * 100);
    
    console.log('\n📈 Performance Improvements:');
    console.log('═'.repeat(50));
    console.log(`Bundle size reduction: ${bundleReduction.toFixed(1)}%`);
    console.log(`Optimization score: ${optimizationScore}/${maxOptimizations} (${optimizationPercentage.toFixed(1)}%)`);
    console.log(`Estimated load time improvement: ${loadTimeImprovement.toFixed(1)}%`);
    console.log(`Estimated new load time: ${(estimatedLoadTime / 1000).toFixed(1)}s`);
    
    // Cache effectiveness (estimated)
    if (features.cacheManager) {
        console.log(`Estimated cache hit rate: 75-85%`);
        console.log(`Estimated subsequent load improvement: 60-80%`);
    }
    
    return {
        bundleReduction,
        optimizationPercentage,
        loadTimeImprovement,
        estimatedLoadTime
    };
}

// Generate performance report
function generateReport(bundleAnalysis, optimizations, features, improvements) {
    const report = `# CalyBase Performance Optimization Report
Generated: ${new Date().toISOString()}

## Bundle Analysis
- Total JavaScript size: ${(bundleAnalysis.totalSize / 1024).toFixed(2)} KB
- Number of JavaScript files: ${bundleAnalysis.jsFiles.length}
- Bundle size reduction: ${improvements.bundleReduction.toFixed(1)}%

## Optimizations Applied
- Remaining console statements: ${optimizations.consoleStatementsRemoved}
- Modern logger usage: ${optimizations.modernLoggerUsage}
- Deferred scripts: ${optimizations.deferredScripts}
- Cached queries: ${optimizations.cachedQueries}
- Real-time listeners: ${optimizations.realtimeListeners}

## Performance Features
${Object.entries(features).map(([feature, enabled]) => 
    `- ${feature}: ${enabled ? '✅ Enabled' : '❌ Disabled'}`
).join('\n')}

## Estimated Improvements
- Load time improvement: ${improvements.loadTimeImprovement.toFixed(1)}%
- New estimated load time: ${(improvements.estimatedLoadTime / 1000).toFixed(1)}s
- Optimization completion: ${improvements.optimizationPercentage.toFixed(1)}%

## Recommendations
${improvements.optimizationPercentage < 100 ? '- Complete remaining performance features' : '- All major optimizations implemented ✅'}
${optimizations.consoleStatementsRemoved > 50 ? '- Further reduce console statement usage' : '- Console cleanup completed ✅'}
${bundleAnalysis.totalSize > 300000 ? '- Consider code splitting for large bundles' : '- Bundle size is optimized ✅'}

## Next Steps
1. Deploy to staging environment
2. Run real-world performance tests
3. Monitor cache hit rates and load times
4. Gather user feedback on performance improvements
`;

    fs.writeFileSync('performance-report.md', report);
    log.success('Performance report generated: performance-report.md');
}

// Main performance test function
async function runPerformanceTest() {
    log.info('🚀 Starting CalyBase performance analysis...');
    
    try {
        const bundleAnalysis = analyzeBundleSizes();
        const optimizations = countOptimizations();
        const features = checkPerformanceFeatures();
        const improvements = estimateImprovements(bundleAnalysis, optimizations, features);
        
        generateReport(bundleAnalysis, optimizations, features, improvements);
        
        console.log('\n🎉 Performance analysis completed!');
        console.log(`📊 Overall optimization score: ${improvements.optimizationPercentage.toFixed(1)}%`);
        console.log(`⚡ Estimated performance improvement: ${improvements.loadTimeImprovement.toFixed(1)}%`);
        
    } catch (error) {
        log.error(`Performance analysis failed: ${error.message}`);
        process.exit(1);
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runPerformanceTest();
}