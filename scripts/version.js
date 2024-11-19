const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get the new version from package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const newVersion = packageJson.version;

// Get the current date
const date = new Date().toISOString().split('T')[0];

// Get commit messages since the last tag
const getCommitsSinceLastTag = () => {
  try {
    const lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
    return execSync(`git log ${lastTag}..HEAD --pretty=format:%s`, { encoding: 'utf8' })
      .split('\n')
      .filter(msg => msg.trim());
  } catch (error) {
    // If no tags exist, get all commits
    return execSync('git log --pretty=format:%s', { encoding: 'utf8' })
      .split('\n')
      .filter(msg => msg.trim());
  }
};

// Parse commit messages into changelog sections
const parseCommits = (commits) => {
  const sections = {
    added: [],
    changed: [],
    deprecated: [],
    removed: [],
    fixed: [],
    security: []
  };

  commits.forEach(commit => {
    const msg = commit.toLowerCase();
    if (msg.startsWith('feat:')) {
      sections.added.push(commit.slice(5).trim());
    } else if (msg.startsWith('fix:')) {
      sections.fixed.push(commit.slice(4).trim());
    } else if (msg.startsWith('change:') || msg.startsWith('refactor:')) {
      sections.changed.push(commit.slice(commit.indexOf(':') + 1).trim());
    } else if (msg.startsWith('deprecate:')) {
      sections.deprecated.push(commit.slice(10).trim());
    } else if (msg.startsWith('remove:')) {
      sections.removed.push(commit.slice(7).trim());
    } else if (msg.startsWith('security:')) {
      sections.security.push(commit.slice(9).trim());
    }
  });

  return sections;
};

// Generate new changelog entry
const generateNewEntry = (version, date, sections) => {
  let entry = `\n## [${version}] - ${date}\n\n`;
  
  Object.entries(sections).forEach(([section, items]) => {
    if (items.length > 0) {
      entry += `### ${section.charAt(0).toUpperCase() + section.slice(1)}\n`;
      items.forEach(item => {
        entry += `- ${item}\n`;
      });
      entry += '\n';
    }
  });
  
  return entry;
};

// Update CHANGELOG.md
const updateChangelog = () => {
  const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
  const changelog = fs.readFileSync(changelogPath, 'utf8');
  
  const commits = getCommitsSinceLastTag();
  const sections = parseCommits(commits);
  const newEntry = generateNewEntry(newVersion, date, sections);
  
  // Insert new entry after the header
  const lines = changelog.split('\n');
  const headerEnd = lines.findIndex(line => line.startsWith('## '));
  
  const updatedChangelog = [
    ...lines.slice(0, headerEnd),
    newEntry.trim(),
    ...lines.slice(headerEnd)
  ].join('\n');
  
  fs.writeFileSync(changelogPath, updatedChangelog);
};

updateChangelog();
