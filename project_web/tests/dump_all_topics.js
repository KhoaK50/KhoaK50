const fs = require('fs');
const content = fs.readFileSync('frontend_v2/js/app/modules/topics/topics_registry.js', 'utf8');

// Also check learning_path.js for nodes
const lpContent = fs.readFileSync('frontend_v2/js/app/ui/learning_path.js', 'utf8');
const lpNodes = lpContent.match(/id:\s*["'][^"']+["'],\s*title:/g) || [];
console.log('LP nodes count:', lpNodes.length);

// Extract topics and sections
const topicsMatch = content.match(/title:\s*"Chủ đề \d+:[^"]+"/g) || [];
console.log('\n--- 7 TOPICS IN REGISTRY ---');
topicsMatch.forEach(t => console.log(t));

const allLessons = content.match(/"Bài \d+:[^"]+"/g) || [];
console.log('\nTotal Lessons:', allLessons.length);
allLessons.forEach((l, idx) => console.log(`${idx + 1}. ${l}`));
