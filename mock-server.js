#!/usr/bin/env node
/**
 * Mock backend server for Annotation Activity Console
 *
 * Simulates the real backend at http://localhost:4000
 * with intentionally messy data (as specified in the brief).
 *
 * Routes:
 *   GET  /api/tasks                  - Paginated task list
 *   GET  /api/tasks/:id              - Single task
 *   GET  /api/tasks/:id/summary      - SSE streaming AI summary
 *   WS   /ws                         - WebSocket live feed
 */

const http = require('http');
const { WebSocketServer } = require('ws');
const url = require('url');

const PORT = 4000;

// ─── Messy raw data (mirrors real backend inconsistencies) ────────────────────

const RAW_TASKS = [
  { id: '1', title: 'Annotate cat images dataset', type: 'image', status: 'in_progress', annotationCount: 47, updatedAt: '2024-06-20T08:30:00Z', assignee: 'alice', description: 'Label all cat breeds in the training dataset.' },
  { id: '2', title: 'Transcribe podcast episodes', type: 'audio', status: 'Done', annotationCount: '12', updatedAt: 1719216600000, assignee: 'bob', description: 'Transcribe 10 podcast episodes for NLP training.' },
  { id: '3', title: 'Classify news articles', type: 'text', status: 'todo', annotationCount: 0, updatedAt: '2024-06-19T15:00:00Z', assignee: null, description: 'Classify 500 news articles into 8 categories.' },
  { id: '4', title: 'Review flagged annotations', type: 'image', status: 'QA', annotationCount: '89', updatedAt: 1719130200000, assignee: 'carol', description: 'QA review of recently flagged annotation batches.' },
  { id: '5', title: 'Label urban driving footage', type: 'video', status: 'BLOCKED', annotationCount: 3, updatedAt: '2024-06-18T09:15:00Z', assignee: 'dave', description: 'Blocked waiting for updated labeling guidelines.' },
  { id: '6', title: 'Sentiment tagging — Twitter corpus', type: 'text', status: 'InProgress', annotationCount: '234', updatedAt: '2024-06-21T11:20:00Z', assignee: 'eve', description: 'Tag 2,000 tweets for sentiment analysis.' },
  { id: '7', title: 'Medical imaging batch A', type: 'image', status: 'done', annotationCount: 156, updatedAt: 1719302400, assignee: 'alice', description: 'Completed annotation of radiology images.' },
  { id: '8', title: 'Audio emotion detection', type: 'audio', status: 'todo', annotationCount: 0, updatedAt: '2024-06-17T14:00:00Z', assignee: null, description: 'Tag emotion labels to speech dataset.' },
  { id: '9', title: 'Social media image moderation', type: 'image', status: 'in_progress', annotationCount: 78, updatedAt: '2024-06-22T07:45:00Z', assignee: 'frank', description: 'Moderate social media images per updated policy.' },
  { id: '10', title: 'Contract text extraction', type: 'text', status: 'QA', annotationCount: '45', updatedAt: 1719388800000, assignee: 'grace', description: 'Extract key terms from legal contracts.' },
  { id: '11', title: 'Satellite imagery segmentation', type: 'image', status: 'todo', annotationCount: 0, updatedAt: '2024-06-16T10:30:00Z', assignee: null, description: 'Segment land-use categories in satellite imagery.' },
  { id: '12', title: 'Podcast speaker diarization', type: 'audio', status: 'InProgress', annotationCount: '19', updatedAt: '2024-06-22T09:00:00Z', assignee: 'heidi', description: 'Identify and label individual speakers in recordings.' },
  { id: '13', title: 'E-commerce product taxonomy', type: 'text', status: 'BLOCKED', annotationCount: 5, updatedAt: 1719475200, assignee: 'ivan', description: 'Taxonomy categorization blocked on schema approval.' },
  { id: '14', title: 'Wildlife camera trap images', type: 'image', status: 'done', annotationCount: 312, updatedAt: '2024-06-15T08:00:00Z', assignee: 'judy', description: 'Completed wildlife species classification.' },
  { id: '15', title: 'Customer support ticket classification', type: 'text', status: 'in_progress', annotationCount: 67, updatedAt: '2024-06-23T06:30:00Z', assignee: 'alice', description: 'Classify support tickets into issue categories.' },
];

function paginate(items, page, pageSize) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };
}

// ─── HTTP Server ──────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  const query = parsed.query;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  const headers = { ...corsHeaders(), 'Content-Type': 'application/json' };

  // GET /api/tasks
  if (req.method === 'GET' && pathname === '/api/tasks') {
    const page = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 10;
    const tasks = paginate(RAW_TASKS, page, pageSize);

    res.writeHead(200, headers);
    res.end(JSON.stringify({ items: tasks, total: RAW_TASKS.length, page, pageSize }));
    return;
  }

  // GET /api/tasks/:id/summary — SSE streaming
  const summaryMatch = pathname.match(/^\/api\/tasks\/(\w+)\/summary$/);
  if (req.method === 'GET' && summaryMatch) {
    const taskId = summaryMatch[1];
    const task = RAW_TASKS.find((t) => t.id === taskId);
    const title = task?.title ?? 'this task';

    const summaryText = `## AI Summary: ${title}

This task involves **structured data annotation** work. Here is what our analysis found:

- The annotation workload is estimated at **moderate complexity**.
- Key challenges: data quality, edge cases, and guideline adherence.
- Recommended approach: batch processing with regular QA checkpoints.

### Key Metrics
- **Efficiency**: Standard throughput expected.
- **Quality Score**: Target ≥ 95% agreement rate.

> _Note: This summary was generated by the AI system and should be reviewed by a team lead._
`;

    res.writeHead(200, {
      ...corsHeaders(),
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    // Stream word by word with delays
    const words = summaryText.split('');
    let i = 0;

    const interval = setInterval(() => {
      if (i >= words.length) {
        res.write('data: [DONE]\n\n');
        clearInterval(interval);
        res.end();
        return;
      }
      // Send chunks of ~5 chars
      const chunk = words.slice(i, i + 5).join('');
      res.write(`data: ${chunk}\n\n`);
      i += 5;
    }, 40);

    req.on('close', () => clearInterval(interval));
    return;
  }

  // GET /api/tasks/:id
  const taskMatch = pathname.match(/^\/api\/tasks\/(\w+)$/);
  if (req.method === 'GET' && taskMatch) {
    const taskId = taskMatch[1];
    const task = RAW_TASKS.find((t) => t.id === taskId);
    if (!task) {
      res.writeHead(404, headers);
      res.end(JSON.stringify({ error: 'Task not found' }));
      return;
    }
    res.writeHead(200, headers);
    res.end(JSON.stringify(task));
    return;
  }

  res.writeHead(404, headers);
  res.end(JSON.stringify({ error: 'Not found' }));
});

// ─── WebSocket Server ─────────────────────────────────────────────────────────

const wss = new WebSocketServer({ server, path: '/ws' });
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`[WS] Client connected. Total: ${clients.size}`);

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[WS] Client disconnected. Total: ${clients.size}`);
  });
});

function broadcast(event) {
  const message = JSON.stringify(event);
  for (const client of clients) {
    if (client.readyState === 1) { // OPEN
      client.send(message);
    }
  }
}

// Simulate live events every few seconds
setInterval(() => {
  const task = RAW_TASKS[Math.floor(Math.random() * RAW_TASKS.length)];
  const eventType = ['task.updated', 'task.assigned', 'annotation.created'][
    Math.floor(Math.random() * 3)
  ];

  let event;
  if (eventType === 'task.updated') {
    event = { type: 'task.updated', payload: { ...task, updatedAt: new Date().toISOString() } };
  } else if (eventType === 'task.assigned') {
    const assignees = ['alice', 'bob', 'carol', 'dave', 'eve'];
    event = {
      type: 'task.assigned',
      payload: {
        taskId: task.id,
        assignee: assignees[Math.floor(Math.random() * assignees.length)],
      },
    };
  } else {
    event = {
      type: 'annotation.created',
      payload: {
        taskId: task.id,
        count: (typeof task.annotationCount === 'number' ? task.annotationCount : parseInt(task.annotationCount, 10)) + 1,
      },
    };
  }

  if (clients.size > 0) {
    broadcast(event);
  }
}, 4000);

server.listen(PORT, () => {
  console.log(`\n✅ Mock backend running at http://localhost:${PORT}`);
  console.log(`🔌 WebSocket available at ws://localhost:${PORT}/ws`);
  console.log(`📋 REST API: GET /api/tasks, GET /api/tasks/:id, GET /api/tasks/:id/summary\n`);
});
