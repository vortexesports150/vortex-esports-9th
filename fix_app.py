import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Add import for ProHostSubscriptionAdmin if not exists
if 'import { ProHostSubscriptionAdmin } from' not in content:
    content = content.replace("import { TournamentSponsorAdmin } from './components/TournamentSponsorAdmin';", "import { TournamentSponsorAdmin } from './components/TournamentSponsorAdmin';\nimport { ProHostSubscriptionAdmin } from './components/ProHostSubscriptionAdmin';")

# Add pro-host-subscriptions to activeView types if not exist
if " | 'pro-host-subscriptions'" not in content:
    content = content.replace("'pro-leagues-admin'>('welcome');", "'pro-leagues-admin' | 'pro-host-subscriptions'>('welcome');")

# Add the button in the owner menu
old_menu = """                                <button
                                  onClick={() => {
                                    setSuperAdminActiveView('pro-leagues-admin');
                                    setOwnerMenuOpen(false);
                                  }}"""

new_menu = """                                <button
                                  onClick={() => {
                                    setSuperAdminActiveView('pro-host-subscriptions');
                                    setOwnerMenuOpen(false);
                                  }}
                                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all text-left mt-1 ${
                                    superAdminActiveView === 'pro-host-subscriptions' 
                                      ? 'bg-slate-800 text-white border border-slate-700' 
                                      : 'text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent'
                                  }`}
                                >
                                  <Users className="h-4 w-4 text-slate-300" />
                                  <span>Subscription</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setSuperAdminActiveView('pro-leagues-admin');
                                    setOwnerMenuOpen(false);
                                  }}"""

content = content.replace(old_menu, new_menu)

# Add the component to render
old_render = """                    {superAdminActiveView === 'pro-leagues-admin' && (
                      <motion.div
                        key="pro-leagues-admin"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="w-full h-full"
                      >
                        <AdminProLeaguesPanel />
                      </motion.div>
                    )}"""

new_render = old_render + """
                    {superAdminActiveView === 'pro-host-subscriptions' && (
                      <motion.div
                        key="pro-host-subscriptions"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="w-full h-full"
                      >
                        <ProHostSubscriptionAdmin />
                      </motion.div>
                    )}"""

content = content.replace(old_render, new_render)

with open('src/App.tsx', 'w') as f:
    f.write(content)
