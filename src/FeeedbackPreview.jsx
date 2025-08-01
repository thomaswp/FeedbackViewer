// FeedbackPreviewApp.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Handlebars from 'handlebars';
import { marked } from 'marked';
import { 
  Switch, 
  FormControl, 
  FormControlLabel, 
  InputLabel, 
  Select, 
  MenuItem, 
  TextField, 
  Typography, 
  Box, 
  Paper 
} from '@mui/material';

const DEFAULT_TEMPLATE = `
{{#unless moderated}}
Your code is off to a really amazing start 🚀🚀🚀!
{{/unless}}

{{#if rationale}}
Hmm, {{> thecodeis}} still not passing all of its test cases. Let's dig into one possible reason why.
{{/if}}

{{#if structured}}### The Problem{{/if}}
{{#if (eq error_id "identified")}}
  {{#if supportive}}
Right now, {{> thecodeis}} not asking the user for the 3 numbers to compare (or there's a mistake in that code).
  {{else}}
Right now, you are failing to correctly ask the user for 3 numbers to compare.
  {{/if}}
{{/if}}

{{#if (eq error_id "guided")}}
  {{#if supportive}}
Remember, the instructions require you ask the user for 3 numbers to compare. How can you get input from the user?
  {{else}}
You are currently failing to follow the instructions. You must ask the user for 3 numbers to compare. Don't forget to do that.
  {{/if}}
{{/if}}

{{#if actionable}}
  {{#if granular}}
Try the following steps:
1. Use the \`input()\` function to read user input.
2. Add a message for the user between the \`(\` and \`)\`. 
3. Store the value in a variable.
4. Try printing the variable, and test your code to make sure it works.
  {{else}}
Try using the \`input()\` function to ask the user for the value of 3 numbers and store these in variables.
  {{/if}}
  
  {{#if not_revealing}}
  To get the first number, use \`num1 = int(input('Enter the first number'))\`.
  {{/if}}
{{/if}}

{{#if concept}}
{{#if structured}}### The \`input\` function{{/if}}
When you want to get input from the user, you can use the \`input\` function. 
* \`input()\` takes an optional argument, which is the question you're asking the user. You can also leave it blank.
* \`input()\` returns the user's answer, which you have to store in a variable to use later, like this: \`my_var = input()\`.
* \`input()\` always returns a string. You may need to convert it to a different data type, like an integer, like this: number = int(input('Enter a number')).
* Remember, \`input()\` is a function — to use it, you have to include the parentheses at the end.

{{#if concept_link}}
In this problem, we need to read user input to get values for the 3 numbers to compare, so we need the \`input()\` function.
{{/if}}
{{/if}}

{{#unless concise}}
The documentation for the \`input()\` function reads:

> If the prompt argument is present, it is written to standard output without a trailing newline. The function then reads a line from input, converts it to a string (stripping a trailing newline), and returns that. When EOF is read, EOFError is raised.
{{/unless}}

{{#if resources}}
Here's [a quick video](https://www.youtube.com/watch?v=SOLnbKI73Wo) on working with user input in python.
{{/if}}

{{#if example}}
{{#if structured}}### Example{{/if}}
Here's a simple example of the \`input()\` function:
\`\`\`
# Prints "What is your name?" and then waits for the user to type something,
# then stores that text in the variable \`name\`
name = input('What is your name?')
# Use the variable name
print('Hello, ' + name)
\`\`\`
{{/if}}

{{#if feature_focus}}
{{#if structured}}### Key take-away{{/if}}
* **When** the instructions say something like "*read user input*"
* **Then** we probably need to use the \`input()\` function.
{{/if}}

`;

const THECODEIS_PARTIAL = `{{#if task_focused}}
your code is
{{else}}
you are
{{/if}}`;

const ALL_PROPERTIES = [
  { id: "error_id", name: "Error identification", values: ["identified", "guided", "false"] },
  { id: "actionable" },
  // { id: "correctness" },
  { id: "granular", dependencies: ["actionable"] },
  { id: "not_revealing", name: "Does not give away the answer" },
  // { id: "learning", name: "Prioritizes learning" },
  { id: "concise" },
  { id: "task_focused" },
  { id: "supportive", name: "Tone: Supportive", dependencies: ["error_id"] },
  { id: "moderated", name: "Tone: Moderated", dependencies: ["error_id"] },
  // { id: "interpretable" },
  // { id: "vocab", name: "Appropriate Technical Vocabulary" },
  { id: "structured" },
  { id: "rationale" },
  { id: "feature_focus", name: "Feature focusing" },
  { id: "example", name: "Worked example" },
  { id: "resources", name: "External resources" },
  // { id: "strategies", name: "Metacognitive strategies" },
  { id: "concept", name: "Conceptual explanation" },
  { id: "concept_link", name: "Links the concept to the problem", dependencies: ["concept"] },
  // { id: "sequence_alignment", name: "Alignment with instructor sequencing" },
  // { id: "transfer", name: "Emphasizes knowledge transfer" },
];

function prettify(id) {
  return id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' ');
}

Handlebars.registerHelper('eq', (a, b) => a === b);
Handlebars.registerHelper('or', function (...args) {
  args.pop(); // last item is Handlebars options
  return args.some(Boolean);
});
Handlebars.registerPartial('thecodeis', THECODEIS_PARTIAL);

function hashNode(el) {
  return el.tagName + el.className + el.innerHTML;
}

function getLeafNodes(el) {
  const nodes = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT, {
    acceptNode: node => node.children.length === 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
  });
  let current;
  while ((current = walker.nextNode())) {
    nodes.push(current);
  }
  return nodes;
}

// const renderer = new marked.Renderer();
// renderer.code = function(code, language) {
//   return `<pre><code class="language-${language || 'text'}">${code}</code></pre>`;
// };

// marked.setOptions({
//   renderer: renderer,
//   breaks: true,
//   gfm: true
// });

export default function FeedbackPreviewApp() {

  const getDefaultValues = () => {
    return ALL_PROPERTIES.reduce((acc, prop) => {
      if (prop.values) {
        acc[prop.id] = prop.values[0]; // default to first value
      } else {
        acc[prop.id] = true;
      }
      return acc;
    }, {});
  };

  const [template, setTemplate] = useState(() => DEFAULT_TEMPLATE);
  const [values, setValues] = useState(getDefaultValues());
  const renderRef = useRef(null);
  const prevHashesRef = useRef(new Set());

  const updateValue = (id, val) => setValues(v => ({ ...v, [id]: val }));


  useEffect(() => {
    try {
      const compiled = Handlebars.compile(template);
      const newHtml = marked(compiled(values));

      const temp = document.createElement('div');
      temp.innerHTML = newHtml;
      const newLeaves = getLeafNodes(temp);
      const newHashes = new Set(newLeaves.map(hashNode));

      // Compare with previous
      const added = newLeaves.filter(el => !prevHashesRef.current.has(hashNode(el)));
      prevHashesRef.current = newHashes;

      if (renderRef.current) {
        renderRef.current.innerHTML = '';
        Array.from(temp.childNodes).forEach(child => renderRef.current.appendChild(child));

        added.forEach(el => {
          el.classList.add('flash');
          setTimeout(() => el.classList.remove('flash'), 500);
        });
      }
    } catch (e) {
      if (renderRef.current) {
        renderRef.current.innerHTML = `<pre>Error rendering template:\n${e.message}</pre>`;
      }
    }
  }, [template, values]);

  useEffect(() => {
    localStorage.setItem('template', template);
  }, [template]);

  return (
    <Box sx={{ display: 'flex', gap: 2, p: 2, minHeight: '100vh', bgcolor: 'grey.100' }}>
      <Paper sx={{ width: '33%', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h5" fontWeight="bold">Feedback Settings</Typography>
        {ALL_PROPERTIES.map(prop => {
          const name = prop.name || prettify(prop.id);
          const disabled = prop.dependencies?.some(dep => !values[dep]);

          if (prop.values) {
            return (
              <div key={prop.id} className="space-y-1">
                <FormControl fullWidth disabled={disabled} size="small">
                  <InputLabel>{name}</InputLabel>
                  <Select
                    value={values[prop.id] || ''}
                    onChange={e => updateValue(prop.id, e.target.value)}
                    label={name}
                  >
                    {prop.values.map(val => (
                      <MenuItem key={val} value={val}>{prettify(val)}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>
            );
          }

          return (
            <FormControlLabel
              key={prop.id}
              control={
                <Switch
                  checked={!!values[prop.id]}
                  onChange={e => updateValue(prop.id, e.target.checked)}
                  disabled={disabled}
                />
              }
              label={name}
              labelPlacement="start"
              sx={{ justifyContent: 'space-between', ml: 0 }}
            />
          );
        })}
      </Paper>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h5" fontWeight="bold">Rendered Feedback</Typography>
        <Typography
            component="div"
            variant="body1"
            ref={renderRef}
            sx={{
                p: 3,
                '& h1, & h2, & h3, & h4, & h5, & h6': {
                fontFamily: 'theme.typography.h4.fontFamily',
                fontWeight: 'bold',
                mb: 2,
                mt: 3
                },
                '& p': { mb: 2 },
                '& ul, & ol': { pl: 3, mb: 2 },
                '& code': { 
                bgcolor: 'grey.100', 
                px: 0.5, 
                py: 0.25, 
                borderRadius: 1,
                fontFamily: 'monospace'
                }
            }}
        >
          <Paper
            ref={renderRef}
          />
        </Typography>

        <Typography variant="h5" fontWeight="bold" sx={{ mt: 4 }}>Edit Template</Typography>
        <TextField
          multiline
          rows={16}
          fullWidth
          value={template}
          onChange={e => setTemplate(e.target.value)}
          sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
        />
      </Box>

      <style jsx>{`
        .flash {
          animation: flashHighlight 0.5s ease-out;
        }

        @keyframes flashHighlight {
          0% { background-color: #fffbe6; }
          100% { background-color: white; }
        }
      `}</style>
    </Box>
  );
}
