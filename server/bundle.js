import { rollup } from 'rollup';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

async function bundle() {
  try {
    // Create Rollup bundle
    const bundle = await rollup({
      input: 'src/main.js',
      plugins: [
        resolve({
          preferBuiltins: true // Handle Node.js built-ins (e.g., http)
        }),
        commonjs({
          include: ['node_modules/**'],
          exclude: []
        }),
        json() // Handle JSON files (e.g., socket.io/package.json)
      ]
    });

    // Generate and write output
    await bundle.write({
      file: '../build/server.js',
      format: 'es',
      exports: 'auto'
    });

    console.log('Bundle created !');
  } catch (error) {
    console.error('Bundling failed:', error.message);
    process.exit(1);
  }
}

// Run bundling
bundle();