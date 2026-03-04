import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'C:\Users\Admin\Desktop\Agente-modelos\web\src\pages\Promotions.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

checks = [
    'engagement_rate || 0',
    'statsLastUpdated',
    'openProposeModal',
    'submitProposeSFS',
    'proposeModalOpen',
    'payload.history',
    'colorFollowers',
]
for c in checks:
    print(c, ':', 'OK' if c in content else 'MISSING')
