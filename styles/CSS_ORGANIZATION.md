# SOLID CSS Organization System

## Overview
This document defines the CSS file organization structure for the SOLID framework. The system is designed for clarity, maintainability, and scalability.

## Directory Structure

```
styles/
├── core.css                    # Core framework (tokens, base, utilities)
├── layout.css                  # Grid, flexbox, main layout patterns
├── components/                 # Reusable UI components
├── features/                   # Feature-specific complex components
└── utilities/                  # Pure utility classes
```

## Organization Rules

### Root Level (`styles/`)
**Purpose:** Foundation files only  
**Contains:** Core framework and primary layout systems

- `core.css` - Design tokens, reset, base styles, cascade layers
- `layout.css` - Layout patterns, grid systems, container definitions
- Other framework-level files as needed

**Rule:** No component-specific styles at root level

### Components Directory (`styles/components/`)
**Purpose:** Small, reusable UI elements  
**Size guideline:** Typically under 200 lines  
**Characteristics:**
- Single-purpose components
- Reusable across multiple pages
- Self-contained styling
- Clear component boundaries

**Examples:**
- `buttons.css` - Button variants and states
- `forms.css` - Form inputs, labels, validation
- `modals.css` - Modal dialog boxes
- `navbar.css` - Navigation bar component
- `footer.css` - Footer component
- `badges.css` - Badge/tag components
- `autocomplete.css` - Autocomplete dropdown
- `images.css` - Image containers and styling
- `loading.css` - Loading spinners and indicators
- `sliders.css` - Range sliders and switches
- `number_input.css` - Numeric input controls
- `quantity_selector.css` - Quantity increment/decrement
- `single_image_input.css` - Single image upload widget
- `terminal.css` - CLI terminal aesthetic component

**When to use:** If it's a small, reusable piece of UI that appears in multiple contexts, it belongs here.

### Features Directory (`styles/features/`)
**Purpose:** Complex, feature-specific styling  
**Size guideline:** Typically over 200 lines  
**Characteristics:**
- Page-specific or application-specific
- Complex interactions or layouts
- May combine multiple components
- Feature-focused rather than component-focused

**Examples:**
- `dashboard.css` - Dashboard page layout
- `editor.css` - Rich text editor interface
- `profile.css` - User profile pages
- `image_selector.css` - Image gallery/selection interface
- `image_tray.css` - Image management tray
- `icon_selector.css` - Icon selection interface
- `profile_selector.css` - Profile/avatar selection

**When to use:** If it's a complex feature with custom layout or interactions specific to a particular use case, it belongs here.

### Utilities Directory (`styles/utilities/`)
**Purpose:** Pure utility classes and helpers  
**Characteristics:**
- Single-purpose utility classes
- Animation definitions
- Print styles
- Accessibility overrides
- Classes that don't fit the component model

**Examples:**
- `animations.css` - Keyframe animations and transitions
- `print.css` - Print-specific styling (if needed)
- `accessibility.css` - A11y overrides (if needed)

**When to use:** For classes that provide single-purpose utilities or don't fit into the component/feature paradigm.

## Decision Framework

When creating a new CSS file, ask these questions:

1. **Is it foundational?** (tokens, reset, base styles)  
   → Root level

2. **Is it a small, reusable component?**  
   → `components/`

3. **Is it a complex, feature-specific implementation?**  
   → `features/`

4. **Is it a pure utility or helper?**  
   → `utilities/`

## Load Order in header.php

The header.php file loads CSS in this specific order to respect the cascade:

1. **Config** (`config/config.css`) - Design tokens and color system
2. **Core** (`styles/core.css`) - Foundation styles with cascade layers
3. **Layout** (`styles/layout.css`) - Layout patterns
4. **Components** (`styles/components/*`) - Reusable UI components
5. **Features** (`styles/features/*`) - Feature-specific styles
6. **Utilities** (`styles/utilities/*`) - Utility classes and animations

This load order ensures:
- Tokens are available before they're used
- Base styles establish defaults before components override them
- Components load before features that may combine them
- Utilities can override component and feature styles when needed

## Cascade Layer System

The SOLID framework uses CSS cascade layers defined in `core.css`:

```css
@layer reset, tokens, base, components, utilities;
```

**Layer order (lowest to highest specificity):**
1. `reset` - CSS reset and normalization
2. `tokens` - Design token definitions
3. `base` - Base element styles
4. `components` - Component-specific styles
5. `utilities` - Utility classes (highest priority)

**Best practices:**
- Most component styles should use the `components` layer
- Utility classes should use the `utilities` layer
- Foundation styles belong in `reset`, `tokens`, or `base` layers

## Naming Conventions

### File names
- Use lowercase with underscores: `number_input.css`
- Be descriptive: `image_selector.css` not `selector.css`
- Match the primary component class name when possible

### CSS class names
- Use BEM-style naming: `.component__element--modifier`
- Component classes: `.component-name`
- Element classes: `.component-name__element`
- Modifier classes: `.component-name--variant`

### Examples
```css
/* Component */
.terminal { }

/* Elements */
.terminal__header { }
.terminal__body { }
.terminal__cursor { }

/* Modifiers */
.terminal--classic { }
.terminal--amber { }
```

## Migration Guide

When reorganizing existing CSS:

1. **Identify the type:** Component vs Feature vs Utility
2. **Move the file** to the appropriate directory
3. **Update header.php** to reference the new path
4. **Test thoroughly** to ensure no broken styles
5. **Update any documentation** that references the file

## Maintenance

### Adding new styles
1. Determine which category (component/feature/utility)
2. Create file in appropriate directory
3. Add reference to header.php in correct section
4. Document any new patterns in this file

### Refactoring existing styles
1. Review file size and complexity
2. Consider splitting large files into smaller components
3. Move misplaced files to correct directories
4. Update header.php references

### Deprecating styles
1. Comment as deprecated in the file
2. Add TODO note with removal date
3. Update header.php to skip loading if appropriate
4. Remove after grace period

## Quick Reference

| Type | Location | Size | Reusability | Example |
|------|----------|------|-------------|---------|
| Foundation | `styles/` | Any | Framework-wide | core.css |
| Component | `styles/components/` | < 200 lines | High | buttons.css |
| Feature | `styles/features/` | > 200 lines | Low-Medium | dashboard.css |
| Utility | `styles/utilities/` | Any | High | animations.css |

## Notes

- This organization supports the cascade layer system in core.css
- Component styles should be portable and reusable
- Feature styles can be page-specific and complex
- When in doubt, start with components and refactor to features if it grows too complex
- Keep related styles together (e.g., all form-related components in forms.css)

---

**Last Updated:** 2025-10-02  
**SOLID Framework Version:** Early Stage
