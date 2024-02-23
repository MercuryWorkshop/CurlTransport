import { fileURLToPath } from 'node:url';
import typescript from 'rollup-plugin-typescript2';


const configs = [

  {
    input: 'dist/index.cjs',
    output: {
      file: `dist/bare.cjs`,
      format: 'umd',
      name: 'BareTLS',
      sourcemap: true,
      exports: 'auto',
    },
    plugins: [],
  },
];

export default configs;
