const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const isDev = process.argv.includes('--watch') || process.env.NODE_ENV === 'development';

const baseConfig = {
    bundle: true,
    platform: 'browser',
    format: 'esm',
    loader: {
        '.js': 'jsx',
        '.ts': 'tsx',
        '.tsx': 'tsx'
    },
    sourcemap: isDev,
    external: ['electron'],
    define: {
        'process.env.NODE_ENV': `"${process.env.NODE_ENV || 'development'}"`,
    },
    target: 'es2022',
    tsconfig: './tsconfig.json'
};

const entryPoints = [
    { in: 'src/ui/app/HeaderController.js', out: 'public/build/header' },
    { in: 'src/ui/app/ClaireApp.js', out: 'public/build/content' },
    { in: 'src/ui/app/OverlayController.js', out: 'public/build/overlay' },
];

// Copy shader files to maintain the working shader loading
function copyShaders() {
    // Keep the shaders in the original marble directory where they were working
    console.log('ℹ️ Shaders maintained in original location');
}

async function obfuscateBundle(filePath) {
    let JavaScriptObfuscator;
    try {
        // Suppress promotional console output from javascript-obfuscator on require
        const _log = console.log;
        console.log = () => {};
        JavaScriptObfuscator = require('javascript-obfuscator');
        console.log = _log;
    } catch {
        console.warn('⚠️  javascript-obfuscator not installed — skipping obfuscation');
        return;
    }
    const code = fs.readFileSync(filePath, 'utf8');
    const result = JavaScriptObfuscator.obfuscate(code, {
        compact: true,
        controlFlowFlattening: false,
        identifierNamesGenerator: 'hexadecimal',
        renameGlobals: false,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 0.75,
        splitStrings: true,
        splitStringsChunkLength: 10,
        selfDefending: false,
    });
    fs.writeFileSync(filePath, result.getObfuscatedCode());
    console.log(`🔒 Obfuscated: ${filePath}`);
}

async function build() {
    try {
        console.log('Building renderer process code...');
        await Promise.all(entryPoints.map(point => esbuild.build({
            ...baseConfig,
            entryPoints: [point.in],
            outfile: `${point.out}.js`,
        })));

        // Copy shader files after build
        copyShaders();

        // Obfuscate renderer bundles in production
        if (!isDev) {
            console.log('🔒 Obfuscating renderer bundles...');
            await Promise.all(entryPoints.map(point => obfuscateBundle(`${point.out}.js`)));
        }

        console.log('✅ Renderer builds successful!');
    } catch (e) {
        console.error('Renderer build failed:', e);
        process.exit(1);
    }
}

async function watch() {
    try {
        const contexts = await Promise.all(entryPoints.map(point => esbuild.context({
            ...baseConfig,
            entryPoints: [point.in],
            outfile: `${point.out}.js`,
        })));
        
        console.log('Watching for changes...');
        await Promise.all(contexts.map(context => context.watch()));

    } catch (e) {
        console.error('Watch mode failed:', e);
        process.exit(1);
    }
}

if (process.argv.includes('--watch')) {
    watch();
} else {
    build();
} 