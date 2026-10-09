const fs = require('fs');
const content = fs.readFileSync('frontend_v2/js/app/modules/topics/topics_registry.js', 'utf8');
const lessons = content.match(/"Bài \d+:[^"]+"/g) || [];
console.log('Total lessons matched:', lessons.length);
if (lessons.length > 0) {
  console.log('First:', lessons[0]);
  console.log('Last:', lessons[lessons.length - 1]);
}
