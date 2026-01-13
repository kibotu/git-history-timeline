/**
 * Build the widget.html file with embedded data
 * Injects the commit data into the HTML template
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, '..', 'dist', 'widget-data.json');
const TEMPLATE_FILE = join(__dirname, '..', 'dist', 'widget.html');
const OUTPUT_FILE = join(__dirname, '..', 'dist', 'widget.html');

function buildWidget() {
  console.log('🔨 Building animated widget...');
  
  // Load data
  const data = JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
  console.log(`   Loaded data: ${data.totalDays} days, ${data.totalCommits.toLocaleString()} commits`);
  
  // Load template
  let template = readFileSync(TEMPLATE_FILE, 'utf-8');
  
  // Inject data
  const dataJson = JSON.stringify(data);
  template = template.replace('{{WIDGET_DATA}}', dataJson);
  
  // Write output
  writeFileSync(OUTPUT_FILE, template);
  
  console.log(`✅ Widget built successfully: ${OUTPUT_FILE}`);
  console.log(`\n📦 Embed code:`);
  console.log(`<iframe`);
  console.log(`  src="widget.html?duration=30&theme=dark&autoplay=true"`);
  console.log(`  width="100%"`);
  console.log(`  height="300"`);
  console.log(`  frameborder="0"`);
  console.log(`  style="border: none; border-radius: 8px;">`);
  console.log(`</iframe>`);
}

try {
  buildWidget();
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
