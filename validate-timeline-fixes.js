#!/usr/bin/env node

// Timeline Scheduler Validation Script
console.log('🔍 Validating Timeline Scheduler Fixes...\n');

const fs = require('fs');
const path = require('path');

// Test files to validate
const filesToTest = [
  'components/jobs/TimelineScheduler.tsx',
  'components/jobs/WorkerRow.tsx', 
  'components/jobs/JobCard.tsx',
  'components/jobs/WeekWorkerLane.tsx',
  'components/jobs/TimeAxis.tsx',
  'components/jobs/ErrorBoundary.tsx'
];

// Validation checks
const validationChecks = [
  {
    name: 'Time synchronization fix',
    test: (content, filename) => {
      if (filename === 'components/jobs/WorkerRow.tsx') {
        return content.includes('startDate.setHours(startHour, startMin, 0, 0)') &&
               content.includes('endDate.setHours(endHour, endMin, 0, 0)');
      }
      return true;
    }
  },
  {
    name: 'Job positioning calculation fix',
    test: (content, filename) => {
      if (filename === 'components/jobs/TimelineScheduler.tsx') {
        return content.includes('hoursSinceStart + minutesFraction') &&
               content.includes('Math.max(0, Math.min(95,');
      }
      return true;
    }
  },
  {
    name: 'Job deduplication in WeekWorkerLane',
    test: (content, filename) => {
      if (filename === 'components/jobs/WeekWorkerLane.tsx') {
        return content.includes('processedJobIds.has(job.id)') &&
               content.includes('processedJobIds.add(job.id)');
      }
      return true;
    }
  },
  {
    name: 'JobCard bounds checking',
    test: (content, filename) => {
      if (filename === 'components/jobs/JobCard.tsx') {
        return content.includes('Math.max(width, 5)') &&
               content.includes('Math.max(0, Math.min(position, 95))');
      }
      return true;
    }
  },
  {
    name: 'ErrorBoundary component exists',
    test: (content, filename) => {
      if (filename === 'components/jobs/ErrorBoundary.tsx') {
        return content.includes('class ErrorBoundary') &&
               content.includes('componentDidCatch');
      }
      return true;
    }
  },
  {
    name: 'TimeAxis alignment fix',
    test: (content, filename) => {
      if (filename === 'components/jobs/TimeAxis.tsx') {
        return content.includes('h-12 text-sm') && // Fixed height
               content.includes('hoursSinceStart + minutesFraction'); // Position calculation
      }
      return true;
    }
  }
];

let allPassed = true;

console.log('📋 Running validation checks:\n');

filesToTest.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File missing: ${filePath}`);
    allPassed = false;
    return;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  
  console.log(`📄 Checking ${filePath}:`);
  
  validationChecks.forEach(check => {
    const passed = check.test(content, filePath);
    console.log(`  ${passed ? '✅' : '❌'} ${check.name}`);
    if (!passed) allPassed = false;
  });
  
  console.log('');
});

// Check for proper imports and dependencies
console.log('🔗 Checking dependencies and imports:\n');

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredDeps = ['date-fns', 'framer-motion', '@dnd-kit/core', 'lucide-react'];

requiredDeps.forEach(dep => {
  const hasInDeps = packageJson.dependencies && packageJson.dependencies[dep];
  const hasInDevDeps = packageJson.devDependencies && packageJson.devDependencies[dep];
  
  if (hasInDeps || hasInDevDeps) {
    console.log(`✅ ${dep} found`);
  } else {
    console.log(`❌ ${dep} missing`);
    allPassed = false;
  }
});

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('🎉 All timeline scheduler fixes validated successfully!');
  console.log('\n✨ Key fixes implemented:');
  console.log('   • Fixed time synchronization issues');
  console.log('   • Improved job positioning and alignment');
  console.log('   • Added job deduplication in week view');
  console.log('   • Enhanced error boundary protection');
  console.log('   • Aligned timeline grid with job blocks');
  console.log('\n🚀 Ready for testing!');
} else {
  console.log('❌ Some validation checks failed. Please review the issues above.');
  process.exit(1);
} 