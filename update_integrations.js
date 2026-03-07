const fs = require('fs');

const path = 'c:\\Users\\abhip\\.gemini\\antigravity\\scratch\\tessera\\tessera-os\\apps\\web\\src\\app\\integrations\\page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace imports
if (!content.includes('Cpu } from \'lucide-react\'')) {
  content = content.replace("Plug, Database", "Plug, Cpu, Database");
}

// Target the explicit starts and ends to replace only the sections
const activeStart = content.indexOf('{/* 1. ACTIVE CONNECTIONS SECTION */}');
const activeEnd = content.indexOf('{/* 2. GLOBAL CATALOG SECTION */}');
const catalogStart = content.indexOf('{/* 2. GLOBAL CATALOG SECTION */}');
const catalogEnd = content.indexOf('</section>\\n\\n          </div>\\n        )}\\n\\n      </div>');

if (activeStart > -1 && catalogEnd > -1) {
  const trailingHTML = content.substring(catalogEnd);

  const newActive = `            {/* 1. ACTIVE CONNECTIONS SECTION (SPLIT) */}
            {activeTools.filter(t => t.name.toLowerCase().includes('llm') || t.name.toLowerCase().includes('ai compute')).length > 0 && (
              <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 mb-12">
                <div className="mb-6 border-b border-zinc-800/50 pb-3">
                  <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2 tracking-wide mb-1">
                    <CheckCircle2 className="text-blue-500" size={24} />
                    Tenant Intelligence Active
                  </h2>
                  <p className="text-sm text-zinc-400">Applied automatically to all agents across all workspaces.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeTools.filter(t => t.name.toLowerCase().includes('llm') || t.name.toLowerCase().includes('ai compute')).map((tool) => (
                    <div
                      key={tool.id}
                      className="bg-zinc-900/50 backdrop-blur-xl border border-blue-500/30 shadow-[0_0_25px_rgba(59,130,246,0.1)] rounded-2xl p-6 hover:border-blue-500/60 transition-all group flex flex-col h-full relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 bg-blue-500/10 text-blue-400 text-[10px] font-bold px-3 py-1.5 rounded-bl-xl border-b border-l border-blue-500/20 flex items-center gap-1.5 tracking-wider shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        ACTIVE
                      </div>

                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 flex items-center justify-center mb-5 text-blue-400 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                        <Cpu size={26} />
                      </div>

                      <h3 className="text-xl font-bold text-zinc-100 mb-2">{tool.connection_name || tool.name}</h3>
                      <p className="text-sm text-zinc-400 flex-1 leading-relaxed"><span className="text-zinc-600 font-semibold uppercase text-xs tracking-wider block mb-1">Type: {tool.name}</span>{tool.description}</p>

                      <div className="mt-6 flex gap-2 w-full">
                        <button
                          onClick={() => openToolModal(tool, true)}
                          className="flex-1 py-2.5 bg-zinc-950/50 hover:bg-blue-500/10 border border-zinc-800 hover:border-blue-500/50 text-zinc-300 hover:text-blue-400 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                          <Settings size={16} /> Edit
                        </button>
                        <button
                          onClick={() => openToolModal(tool)}
                          className="flex-1 py-2.5 bg-zinc-950/50 hover:bg-blue-500/10 border border-zinc-800 hover:border-blue-500/50 text-zinc-300 hover:text-blue-400 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                          <Plus size={16} /> New
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeTools.filter(t => !t.name.toLowerCase().includes('llm') && !t.name.toLowerCase().includes('ai compute')).length > 0 && (
              <section className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="mb-6 border-b border-zinc-800/50 pb-3">
                  <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2 tracking-wide mb-1">
                    <CheckCircle2 className="text-emerald-500" size={24} />
                    Node Capabilities Active
                  </h2>
                  <p className="text-sm text-zinc-400">Credentials securely stored here. Assign these to specific Agent Nodes in the Studio to use them.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeTools.filter(t => !t.name.toLowerCase().includes('llm') && !t.name.toLowerCase().includes('ai compute')).map((tool) => (
                    <div
                      key={tool.id}
                      className="bg-zinc-900/50 backdrop-blur-xl border border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.1)] rounded-2xl p-6 hover:border-emerald-500/60 transition-all group flex flex-col h-full relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-3 py-1.5 rounded-bl-xl border-b border-l border-emerald-500/20 flex items-center gap-1.5 tracking-wider shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        ACTIVE
                      </div>

                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center mb-5 text-emerald-400 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                        {tool.logo_icon === 'database' ? <Database size={26} /> : <Server size={26} />}
                      </div>

                      <h3 className="text-xl font-bold text-zinc-100 mb-2">{tool.connection_name || tool.name}</h3>
                      <p className="text-sm text-zinc-400 flex-1 leading-relaxed"><span className="text-zinc-600 font-semibold uppercase text-xs tracking-wider block mb-1">Type: {tool.name}</span>{tool.description}</p>

                      <div className="mt-6 flex gap-2 w-full">
                        <button
                          onClick={() => openToolModal(tool, true)}
                          className="flex-1 py-2.5 bg-zinc-950/50 hover:bg-emerald-500/10 border border-zinc-800 hover:border-emerald-500/50 text-zinc-300 hover:text-emerald-400 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                          <Settings size={16} /> Edit
                        </button>
                        <button
                          onClick={() => openToolModal(tool)}
                          className="flex-1 py-2.5 bg-zinc-950/50 hover:bg-emerald-500/10 border border-zinc-800 hover:border-emerald-500/50 text-zinc-300 hover:text-emerald-400 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                          <Plus size={16} /> New
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            
`;

  const newCatalog = `            {/* 2. GLOBAL CATALOG SECTION (SPLIT) */}
            <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 mb-12">
              <div className="mb-6 border-b border-zinc-800/50 pb-3">
                <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2 tracking-wide mb-1">
                  Tenant Intelligence Catalog
                </h2>
                <p className="text-sm text-zinc-400">Configure global AI Brains for your agents. Once configured, they are active globally.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {catalogTools.filter(t => t.name.toLowerCase().includes('llm') || t.name.toLowerCase().includes('ai compute')).map((tool) => (
                  <div
                    key={tool.id}
                    className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-6 hover:bg-zinc-900/80 hover:border-blue-500/30 transition-all group flex flex-col h-full relative overflow-hidden"
                  >
                    <div className="w-14 h-14 rounded-xl bg-zinc-950 border border-zinc-800/50 flex items-center justify-center mb-5 text-zinc-400 group-hover:text-blue-400 group-hover:border-blue-500/30 group-hover:shadow-[0_0_15px_rgba(37,99,235,0.2)] transition-all">
                      <Cpu size={26} />
                    </div>

                    <h3 className="text-xl font-bold text-zinc-100 mb-2">{tool.name}</h3>
                    <p className="text-sm text-zinc-500 flex-1 leading-relaxed group-hover:text-zinc-400 transition-colors">{tool.description}</p>

                    <button
                      onClick={() => openToolModal(tool)}
                      className="mt-6 w-full py-2.5 bg-zinc-950/50 hover:bg-blue-600 border border-zinc-800 hover:border-blue-500 text-zinc-300 hover:text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 group-hover:shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                    >
                      <Key size={16} /> Configure Setup
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
              <div className="mb-6 border-b border-zinc-800/50 pb-3">
                <h2 className="text-xl font-bold text-zinc-100 tracking-wide mb-1">
                  Node Capabilities Catalog
                </h2>
                <p className="text-sm text-zinc-400">Configure tools to be selectively assigned to specific agents.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {catalogTools.filter(t => !t.name.toLowerCase().includes('llm') && !t.name.toLowerCase().includes('ai compute')).map((tool) => (
                  <div
                    key={tool.id}
                    className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-6 hover:bg-zinc-900/80 hover:border-emerald-500/30 transition-all group flex flex-col h-full relative overflow-hidden"
                  >
                    <div className="w-14 h-14 rounded-xl bg-zinc-950 border border-zinc-800/50 flex items-center justify-center mb-5 text-zinc-400 group-hover:text-emerald-400 group-hover:border-emerald-500/30 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all">
                      {tool.logo_icon === 'database' ? <Database size={26} /> : <Server size={26} />}
                    </div>

                    <h3 className="text-xl font-bold text-zinc-100 mb-2">{tool.name}</h3>
                    <p className="text-sm text-zinc-500 flex-1 leading-relaxed group-hover:text-zinc-400 transition-colors">{tool.description}</p>

                    <button
                      onClick={() => openToolModal(tool)}
                      className="mt-6 w-full py-2.5 bg-zinc-950/50 hover:bg-emerald-600 border border-zinc-800 hover:border-emerald-500 text-zinc-300 hover:text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                    >
                      <Key size={16} /> Configure Setup
                    </button>
                  </div>
                ))}
              </div>

              {catalogTools.length === 0 && (
                <div className="text-center py-16 text-zinc-500 border border-dashed border-zinc-800/50 rounded-2xl bg-zinc-900/20 backdrop-blur-sm mt-6">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 text-emerald-500">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-300 mb-2">Platform Mastered</h3>
                  <p>You have configured every tool available in the global catalog.</p>
                </div>
              )}
`;

  content = content.substring(0, activeStart) + newActive + newCatalog + trailingHTML;
  fs.writeFileSync(path, content, 'utf8');
  console.log("Successfully patched page.tsx securely.");
} else {
  console.log("Could not find replacement margins", activeStart, catalogStart, catalogEnd);
  console.log(content.indexOf('</section>\\n\\n          </div>\\n        )}\\n\\n      </div>'));
}
