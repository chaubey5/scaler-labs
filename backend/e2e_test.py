import requests, sys
BASE='http://127.0.0.1:8000/api'
print('Base URL', BASE)
PUBLIC_BASE = BASE.replace('/api', '/api/public')
# 1. Create form
r = requests.post(f'{BASE}/forms/', json={'title':'E2E Test Form','status':'draft'})
print('Create form status', r.status_code)
if r.status_code!=200:
    print(r.text); sys.exit(1)
form = r.json()
print('Form created', form['id'])
form_id = form['id']

# 2. Update form with questions
questions = [
    {'type':'short_text','title':'Name','description':'Your full name','is_required':True,'order_index':0,'options':[]},
    {'type':'multiple_choice','title':'Color','description':'Pick one','is_required':False,'order_index':1,'options':['Red','Blue','Green']}
]
ru = requests.put(f'{BASE}/forms/{form_id}', json={'title':'E2E Test Form','status':'draft','questions':questions})
print('Update form', ru.status_code)
if ru.status_code!=200:
    print(ru.text); sys.exit(1)

# 3. Publish form
rp = requests.put(f'{BASE}/forms/{form_id}', json={'status':'published'})
print('Publish', rp.status_code)
if rp.status_code!=200:
    print(rp.text); sys.exit(1)

# 4. Fetch public form
rf = requests.get(f'{PUBLIC_BASE}/forms/{form_id}')
print('Fetch public form', rf.status_code)
if rf.status_code!=200:
    print(rf.text); sys.exit(1)
print('Public form title:', rf.json().get('title'))

# 5. Submit a response
answers = [
    {'question_id': rf.json()['questions'][0]['id'], 'value': 'Alice'},
    {'question_id': rf.json()['questions'][1]['id'], 'value': 'Blue'}
]
rs = requests.post(f'{PUBLIC_BASE}/forms/{form_id}/responses', json={'answers':answers})
print('Submit response', rs.status_code, rs.text)
if rs.status_code!=200:
    print(rs.text); sys.exit(1)

# 6. Get responses (owner)
rlist = requests.get(f'{BASE}/forms/{form_id}/responses')
print('List responses', rlist.status_code)
print(rlist.json())

# 7. Export CSV
re = requests.get(f'{BASE}/forms/{form_id}/export')
print('Export CSV status', re.status_code)
print(re.text[:400])

print('E2E script completed successfully')
