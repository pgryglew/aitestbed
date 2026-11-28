(() => {
  const context = document.modelContext;
  if (!context || typeof context.registerTool !== 'function') return;

  Promise.resolve(context.registerTool({
    name: 'summarize_voltrider',
    description: 'Returns a concise, read-only summary of the VoltRider motorcycle guide or its selection advice.',
    inputSchema: {
      type: 'object',
      properties: {
        section: {
          type: 'string',
          enum: ['overview', 'models', 'comparison', 'riding-advice'],
          description: 'Which part of the page to summarize.',
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: async ({ section = 'overview' } = {}) => {
      const summaries = {
        overview: 'VoltRider is an independent Polish-language guide to electric off-road motorcycles. It is not a manufacturer or dealer. Specs vary by market and model year; confirm with the source before purchase.',
        models: 'The guide compares Stark VARG MX 1.2 for motocross, Sur-Ron Light Bee X and Talaria Sting R MX4 for compact trail/off-road riding, and KTM Freeride E for enduro.',
        comparison: document.querySelector('#porownanie')?.innerText || 'Comparison table is unavailable on this page.',
        'riding-advice': document.querySelector('#wybor')?.innerText || 'The guide recommends choosing a motorcycle based on riding terrain and intended use.',
      };
      return summaries[section] || summaries.overview;
    },
  })).catch(() => {});
})();
