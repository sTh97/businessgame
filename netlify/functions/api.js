'use strict';

const serverless = require('serverless-http');

function rewritePath(event) {
  const original = event.path || event.rawPath || '/';
  const prefixes = ['/.netlify/functions/api', '/.netlify/functions'];
  let path = original.split('?')[0];

  for (const prefix of prefixes) {
    if (path === prefix) {
      path = '/api';
      break;
    }
    if (path.startsWith(`${prefix}/`)) {
      const rest = path.slice(prefix.length);
      path = rest.startsWith('/api') ? rest : `/api${rest}`;
      break;
    }
  }

  event.path = path;
  if (event.rawPath) event.rawPath = path;
  return event;
}

let bootPromise;

async function boot() {
  const { connectDb } = require('../../server/config/db');
  const { createApp } = require('../../server/app');
  const { seedIfNeeded } = require('../../server/scripts/seed');
  await connectDb();
  await seedIfNeeded();
  return serverless(createApp({ serveClient: false }));
}

exports.handler = async (event, context) => {
  if (context) context.callbackWaitsForEmptyEventLoop = false;
  try {
    if (!bootPromise) bootPromise = boot();
    const handler = await bootPromise;
    return handler(rewritePath(event), context);
  } catch (err) {
    bootPromise = null;
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: {
          code: 'BOOT_FAILED',
          message: err.message || 'Server failed to start'
        }
      })
    };
  }
};
