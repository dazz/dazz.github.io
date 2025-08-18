---
allowed-tools: Read, Write, Bash(mkdir:*), Bash(pwd), Bash(date:*), Bash(find:*), Bash(ls:*)
description: Generate a new reusable project-level slash command that follows best practices and can be invoked with `/project:<n>` inside the Claude Code CLI.
---

## Context

- Current directory: !`pwd`
- Current date: !`date +%Y-%m-%d`
- Existing commands: !`find .claude/commands -name "*.md" 2>/dev/null | head -10 || echo "No existing commands found"`
- Project structure overview: !`ls -la`
- Available documentation: !`ls .claude/commands/README.md 2>/dev/null || echo "No README found"`

## Usage

```bash
# Generate a simple command without parameters
claude > /project:create-command audit-security

# Generate a parameterized command
claude > /project:create-command fix-issue --with-params

# Generate a command in a category namespace
claude > /project:create-command frontend:build-assets --category frontend
```

## Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `$ARGUMENTS` | string | Yes | Command name and optional flags | `audit-security --with-params` |
| `--with-params` | flag | No | Include parameter handling in generated command | `--with-params` |
| `--category` | string | No | Place command in subdirectory namespace | `--category frontend` |

## Description

**Primary Goal**: Generate well-structured Claude Code commands that follow consistent patterns and best practices.

**Target Use Cases**:
- Creating standardized project automation commands
- Establishing team-wide command conventions  
- Generating commands with proper context gathering
- Setting up parameterized workflows

**Benefits**:
- Enforces consistent command structure across the project
- Reduces boilerplate when creating new commands
- Ensures all commands follow the established pattern with frontmatter, context, usage, etc.
- Makes commands discoverable and maintainable

## Implementation

### 1. Validate Input and Setup
- Parse command name from `$ARGUMENTS`
- Check for optional flags (`--with-params`, `--category`)
- Create `.claude/commands` directory if it doesn't exist
- Determine target file path based on category

### 2. Generate Command Structure
- Create frontmatter with appropriate `allowed-tools` and `description`
- Add context-gathering commands using `!` syntax
- Include usage examples
- Add parameter documentation if `--with-params` flag is used
- Provide implementation template
- Include detailed output examples

### 3. File Creation and Verification
- Write the generated command to appropriate `.md` file
- Verify file was created successfully
- Show usage instructions for the new command

## Output Example

### Scenario 1: Simple Command Generation

**Input**:
```bash
claude > /project:create-command audit-security
```

**Expected Output**:
```markdown
✅ Command Created Successfully

## Generated File
📁 `.claude/commands/audit-security.md`

## Command Structure
```markdown
---
allowed-tools: Read, Bash(find:*), Bash(grep:*)  
description: Audit repository for security vulnerabilities and generate findings report
---

## Context
- Current directory: !`pwd`
- Current date: !`date +%Y-%m-%d`
- Code files: !`find . -name "*.js" -o -name "*.ts" -o -name "*.py" | head -20`
- Dependencies: !`cat package.json 2>/dev/null || cat requirements.txt 2>/dev/null || echo "No dependency file found"`

## Usage
```bash
claude > /project:audit-security
```

## Parameters
None - this command runs without additional parameters.

## Description
Perform a comprehensive security audit of the repository, identifying potential vulnerabilities, insecure patterns, and dependency issues.

## Implementation
1. Scan codebase for common vulnerability patterns (SQL injection, XSS, etc.)
2. Check dependencies against known CVE databases  
3. Review configuration files for security misconfigurations
4. Generate actionable security report with priorities

## Output Example
[Detailed security audit report with findings, severity levels, and remediation steps]
```

## Next Steps
1. Test your new command: `claude > /project:audit-security`
2. Customize the implementation section for your specific needs
3. Add to version control: `git add .claude/commands/audit-security.md`

## Quick Reference
- Edit command: `.claude/commands/audit-security.md`
- Command name: `/project:audit-security`
- No parameters required
```

### Scenario 2: Parameterized Command with Category

**Input**:
```bash
claude > /project:create-command frontend:build-assets --with-params --category frontend
```

**Expected Output**:
```markdown
✅ Parameterized Command Created Successfully

## Generated File
📁 `.claude/commands/frontend/build-assets.md`

## Next Steps
1. Test your new command: `claude > /project:frontend:build-assets development`
2. Customize the implementation section for your specific needs
3. Add to version control: `git add .claude/commands/frontend/build-assets.md`

## Quick Reference  
- Edit command: `.claude/commands/frontend/build-assets.md`
- Command name: `/project:frontend:build-assets`
- Required parameter: environment (development/production)
- Optional parameter: build flags
```

### Scenario 3: Error Handling

**Input**:
```bash
claude > /project:create-command
```

**Expected Output**:
```markdown
❌ Command Generation Failed

## Missing Required Information
Please provide a command name.

## Usage Examples
```bash
# Simple command
claude > /project:create-command my-command-name

# With parameters  
claude > /project:create-command my-command --with-params

# With category namespace
claude > /project:create-command my-command --category tools
```

## Available Flags
- `--with-params` - Generate command with parameter handling
- `--category <n>` - Place in subdirectory namespace

## Need Help?
See existing commands: `ls .claude/commands/`
```

## Best Practices Applied

### Generated Commands Include
- **Comprehensive frontmatter** with specific allowed-tools
- **Rich context gathering** using `!` commands for fresh project state
- **Clear usage documentation** with examples
- **Detailed parameter specifications** in table format
- **Implementation guidance** with step-by-step approach
- **Realistic output examples** showing expected results

### File Organization
- **Category support** via subdirectories (`frontend/`, `ops/`, `testing/`)
- **Consistent naming** using kebab-case
- **Version control ready** structure

### Error Prevention
- **Input validation** for command names and parameters
- **Directory creation** handling
- **Conflict detection** for existing commands
- **Clear error messages** with usage guidance