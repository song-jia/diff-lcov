import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
    input: 'src/index.js',
    output: {
        file: 'dist/diff-lcov.js',
        format: 'cjs',
        exports: 'auto',
    },
    plugins: [nodeResolve(), commonjs()]
};