import { log } from './config';
import { withOpsLog } from './ops/ops-logger';
import { scrapeNews } from './scrapers/news-aggregator';

async function main() {
  const { logEntry } = await withOpsLog('news-aggregator', scrapeNews);
  log('run-news-collection', `Finished with status=${logEntry.status}`);

  if (logEntry.status === 'error') {
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    log('run-news-collection', `Fatal error: ${error}`);
    process.exit(1);
  });
