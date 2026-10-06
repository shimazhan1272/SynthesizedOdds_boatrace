import { runAllTests } from '../src/utils/tests';

try {
  runAllTests();
  process.exit(0);
} catch (e) {
  console.error(e);
  process.exit(1);
}
