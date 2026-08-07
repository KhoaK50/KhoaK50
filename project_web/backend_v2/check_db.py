import psycopg2
conn = psycopg2.connect('postgresql://postgres.hebswwabrjbmbwqvymal:NtDk2108$$$@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres')
c = conn.cursor()
c.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'loginhistory'")
print(c.fetchall())
