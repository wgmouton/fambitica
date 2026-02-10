import nconf from 'nconf';
import {
  Forbidden,
} from '../libs/errors';
import { apiError } from '../libs/apiError';
import { model as Blocker } from '../models/blocker';

// Middleware to block unwanted IP addresses and clients

// NOTE: it's meant to be used behind a proxy (for example a load balancer)
// that uses the 'x-forwarded-for' header to forward the original IP addresses.

const blockedIps = [];
const blockedClients = [];
let watcherInitialized = false;

function initBlockerWatch() {
  if (watcherInitialized) return;
  watcherInitialized = true;

  const ENABLE_BLOCKER_WATCH = nconf.get('BLOCKER_WATCH_ENABLED') === 'true';
  if (!ENABLE_BLOCKER_WATCH) return;

  Blocker.watchBlockers({
    $or: [
      { type: 'ipaddress' },
      { type: 'client' },
    ],
    area: 'full',
  }, {
    initial: true,
  }).on('change', async change => {
    const { operation, blocker } = change;
    const checkedList = blocker.type === 'ipaddress' ? blockedIps : blockedClients;
    if (operation === 'add') {
      if (blocker.value && !checkedList.includes(blocker.value)) {
        checkedList.push(blocker.value);
      }
    } else if (operation === 'delete') {
      const index = checkedList.indexOf(blocker.value);
      if (index !== -1) {
        checkedList.splice(index, 1);
      }
    }
  }).on('error', err => {
    // Change streams require a replica set; if unavailable, ignore and keep running.
    // eslint-disable-next-line no-console
    console.warn('Blocker watch disabled:', err?.message || err);
  });
}

export default function ipBlocker (req, res, next) {
  initBlockerWatch();
  if (blockedIps.length === 0 && blockedClients.length === 0) return next();

  const ipMatch = blockedIps.find(blockedIp => blockedIp === req.ip) !== undefined;
  if (ipMatch === true) {
    const error = new Forbidden(apiError('ipAddressBlocked'));
    error.skipLogging = true;
    return next(error);
  }

  const clientMatch = blockedClients.find(blockedClient => blockedClient === req.headers['x-client']) !== undefined;
  if (clientMatch === true) {
    const error = new Forbidden(apiError('clientBlocked'));
    error.skipLogging = true;
    return next(error);
  }

  return next();
}
