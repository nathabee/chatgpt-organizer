set -euo pipefail

# Go to repo root (adjust if needed)
# cd /path/to/chatgpt-organizer
cd ~/coding/project/extension/chatgpt-organizer

# ----------------------------
# 1) Create new directory tree
# ----------------------------
mkdir -p src/background/{api,executors,guards,http,logs,session,util}
mkdir -p src/panel/{app,tabs}
mkdir -p src/panel/tabs/{delete,projects,organize,search,logs,stats}
mkdir -p src/shared/{messages,types}

# ----------------------------
# 2) Move existing files into new structure
# ----------------------------
# Background + content
git mv src/background.ts src/background/index.ts
# content can stay top-level (your new plan didn't change it)
# If your current tree is src/content.ts already, do nothing.

# Panel entry stays where it is, but we add app/ + tabs/
# (panel.html / panel.css / panel.ts stay in src/panel/)
# No moves for these:
#   src/panel/panel.ts
#   src/panel/panel.html
#   src/panel/panel.css

# Shared: split into folders (keep names same for now, we’ll refactor later)
git mv src/shared/messages.ts src/shared/messages/index.ts
git mv src/shared/types.ts src/shared/types/index.ts
# dates/storage can stay directly under shared (as in your plan)
#   src/shared/dates.ts
#   src/shared/storage.ts

# ----------------------------
# 3) Touch new empty files (planned modules)
# ----------------------------

# ---- src/background/*
touch src/background/session/session.ts
touch src/background/http/fetchJsonAuthed.ts

touch src/background/api/conversations.ts
touch src/background/api/gizmos.ts

touch src/background/executors/deleteConversations.ts
touch src/background/executors/deleteProjects.ts
touch src/background/executors/moveConversations.ts

touch src/background/logs/actionLog.ts

touch src/background/guards/runLocks.ts

touch src/background/util/time.ts
touch src/background/util/urls.ts

# ---- src/panel/app/*
touch src/panel/app/dom.ts
touch src/panel/app/state.ts
touch src/panel/app/tabs.ts
touch src/panel/app/bus.ts
touch src/panel/app/format.ts

# ---- src/panel/tabs/*
touch src/panel/tabs/delete/tab.ts
touch src/panel/tabs/delete/view.ts
touch src/panel/tabs/delete/model.ts

touch src/panel/tabs/projects/tab.ts
touch src/panel/tabs/projects/view.ts
touch src/panel/tabs/projects/model.ts

touch src/panel/tabs/organize/tab.ts
touch src/panel/tabs/organize/view.ts
touch src/panel/tabs/organize/model.ts

touch src/panel/tabs/search/tab.ts
touch src/panel/tabs/search/view.ts
touch src/panel/tabs/search/model.ts

touch src/panel/tabs/logs/tab.ts
touch src/panel/tabs/logs/view.ts
touch src/panel/tabs/logs/model.ts

touch src/panel/tabs/stats/tab.ts
touch src/panel/tabs/stats/view.ts
touch src/panel/tabs/stats/model.ts

# ---- src/shared/messages/*
touch src/shared/messages/msg.ts
touch src/shared/messages/conversations.ts
touch src/shared/messages/projects.ts
touch src/shared/messages/moves.ts
touch src/shared/messages/logs.ts
touch src/shared/messages/stats.ts

# ---- src/shared/types/*
touch src/shared/types/conversations.ts
touch src/shared/types/projects.ts
touch src/shared/types/logs.ts

echo "Done. Next step: fix imports + decide what stays in shared/messages/index.ts."
