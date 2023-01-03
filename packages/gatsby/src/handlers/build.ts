import { join } from 'path';
import { build } from 'esbuild';
import { glob, FileBlob } from '@vercel/build-utils';
import type { Files, NodeVersion } from '@vercel/build-utils';

export const getHandler = async ({
  nodeVersion,
  handlerFile,
}: {
  nodeVersion: NodeVersion;
  handlerFile: string;
}): Promise<string> => {
  const res = await build({
    entryPoints: [handlerFile],
    loader: { '.ts': 'ts' },
    write: false,
    format: 'cjs',
    target: `node${nodeVersion.major}`,
    platform: 'node',
    bundle: true,
    minify: true,
    define: {
      'process.env.NODE_ENV': "'production'",
    },
  });

  return res.outputFiles[0].text;
};

export const minifyGraphQLEngine = async (): Promise<string> => {
  const res = await build({
    entryPoints: [join('.cache', 'query-engine', 'index.js')],
    minify: true,
    define: {
      'process.env.NODE_ENV': "'production'",
    },
    write: false,
  });

  return res.outputFiles[0].text;
};

export async function getFunctionLibsFiles(): Promise<Files> {
  const files: Files = {};

  /* Copies the required libs for Serverless Functions from .cache to the <name>.func folder */
  for (const cur of [
    {
      name: '.cache/query-engine/assets',
      src: join('.cache', 'query-engine', 'assets'),
    },
    {
      name: '.cache/page-ssr',
      src: join('.cache', 'page-ssr'),
    },
    {
      name: '.cache/data/datastore',
      src: join('.cache', 'data', 'datastore'),
    },
    {
      name: '.cache/caches',
      src: join('.cache', 'caches'),
    },
  ]) {
    const matches = await glob('**', join(process.cwd(), cur.src));
    for (const [path, file] of Object.entries(matches)) {
      files[join(cur.name, path)] = file;
    }
  }

  // Minify pre-bundled GraphQL Engine
  files['.cache/query-engine/index.js'] = new FileBlob({
    data: await minifyGraphQLEngine(),
  });

  return files;
}