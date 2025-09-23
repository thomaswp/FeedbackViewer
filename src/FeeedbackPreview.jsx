// FeedbackPreviewApp.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import code_props from './templates/code/properties.yaml';
import code_template from './templates/code/template.mustache';
import writing_props from './templates/writing/properties.yaml';
import writing_template from './templates/writing/template.mustache';

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

const exampleTemplates = {
  code: {
    name: 'Code',
    properties: code_props,
    template: code_template
  },
  writing: {
    name: 'Writing',
    properties: writing_props.properties,
    template: writing_template
  }
};
const default_template_settings = exampleTemplates.writing;

const ALL_PROPERTIES = default_template_settings.properties;
const DEFAULT_TEMPLATE = default_template_settings.template;

// Not sure how to handle this when switching
// const DEFAULT_TEMPLATE = localStorage.getItem('template') || default_template_settings.template;

const THECODEIS_PARTIAL = `{{#if task_focused}}
your code is
{{else}}
you are
{{/if}}`;

function prettify(id) {
  if (typeof id !== 'string') id = String(id);
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
