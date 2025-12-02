
const fs = require('fs');
const path = require('path');

// Helper to find files recursively
function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
        findFiles(filePath, fileList);
      }
    } else {
      if (/\.(tsx|jsx|js|ts)$/.test(file)) {
        fileList.push(filePath);
      }
    }
  });
  return fileList;
}

const files = findFiles('.');

function processClassString(classString) {
  let classes = classString.split(/\s+/).filter(c => c.trim() !== '');
  let newClasses = [...classes];
  let hasChanges = false;

  // Find all light: classes
  const lightClasses = classes.filter(c => c.startsWith('light:'));

  if (lightClasses.length === 0) return classString;

  lightClasses.forEach(lightClass => {
    const coreClass = lightClass.replace('light:', '');
    
    // Determine property type (bg-, text-, border-, etc.)
    // This is a simplified check, might need more robust property matching for complex tailwind classes
    // But strictly checking collisions based on prefixes like 'bg-', 'text-' is a good start.
    const prefix = coreClass.split('-')[0]; 
    
    // Special handling for color classes which might be 'bg-red-500' vs 'bg-white'
    // If we have 'light:bg-zinc-100', we want to find conflicting 'bg-...' classes.
    
    let propertyRegex;
    if (coreClass.startsWith('bg-')) propertyRegex = /^bg-/;
    else if (coreClass.startsWith('text-')) propertyRegex = /^text-/;
    else if (coreClass.startsWith('border-')) propertyRegex = /^border-/;
    else if (coreClass.startsWith('shadow-')) propertyRegex = /^shadow-/;
    else if (coreClass.startsWith('ring-')) propertyRegex = /^ring-/;
    else if (coreClass.startsWith('divide-')) propertyRegex = /^divide-/;
    else return; // Skip complex or unknown utilities for auto-conflict removal to be safe

    // Find conflicting base classes (no prefix, or modifiers that aren't dark:)
    // Actually we only care about UNPREFIXED classes that conflict.
    // e.g. 'bg-black' conflicts with 'bg-white'.
    // 'hover:bg-black' does NOT conflict with 'bg-white' (different state).
    
    const conflictingBaseIndices = newClasses.findIndex(c => 
        !c.includes(':') && propertyRegex.test(c) && c !== coreClass
    );

    if (conflictingBaseIndices !== -1) {
        // We found a conflicting base class (e.g. 'text-white' when we have 'light:text-black')
        // We assume this base class was intended for Dark mode (since app was dark-first).
        // We should check if an explicit 'dark:' version exists.
        const conflictingBase = newClasses[conflictingBaseIndices];
        const darkVersion = `dark:${conflictingBase}`;
        
        const hasExplicitDark = newClasses.includes(darkVersion);
        
        // Remove the conflicting base class
        newClasses.splice(conflictingBaseIndices, 1);
        
        // If explicit dark doesn't exist, we *could* add it, but looking at the codebase, 
        // it seems `text-white dark:text-white light:text-zinc-900` is common.
        // So usually `dark:` version IS there.
        // If it's NOT there, like `text-white light:text-black`, then `text-white` was serving as dark default.
        // So we should convert `text-white` to `dark:text-white`.
        
        if (!hasExplicitDark) {
            newClasses.push(darkVersion);
        }
    }

    // Replace light: class with core class
    const idx = newClasses.indexOf(lightClass);
    if (idx !== -1) {
        newClasses[idx] = coreClass;
    }
    
    hasChanges = true;
  });

  return hasChanges ? newClasses.join(' ') : classString;
}

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Regex to find className="..." or className={`...`}
  // This is tricky with template literals.
  // Simple replacement for now: look for "light:" and try to process the surrounding class string.
  // Since we can't easily parse full JSX, we'll read the whole file and replace specific patterns if possible,
  // OR just simpler: Replace 'light:' with '' globally?
  // NO, that leaves the old base class active. `bg-black bg-white` -> invalid/order-dependent.
  
  // Let's try a regex that captures className content.
  // Matches className="stuff" or className={'stuff'} or className={`stuff`}
  
  const newContent = content.replace(/className=(?:(?:"([^"]*)")|(?:\{`([^`]*)`\})|(?:'([^']*)'))/g, (match, p1, p2, p3) => {
     const classStr = p1 || p2 || p3;
     if (!classStr) return match; // recursive or complex objects
     
     if (!classStr.includes('light:')) return match;
     
     const processed = processClassString(classStr);
     
     if (p1) return `className="${processed}"`;
     if (p2) return `className={`${processed}`}`;
     if (p3) return `className='${processed}'`;
     return match;
  });

  if (newContent !== content) {
    console.log(`Updating ${filePath}`);
    fs.writeFileSync(filePath, newContent, 'utf8');
  }
});
