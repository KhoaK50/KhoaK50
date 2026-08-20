from neo4j import GraphDatabase
import os
from dotenv import load_dotenv

load_dotenv('D:/Programming_language/project_web/backend_v2/.env')

URI = os.getenv("NEO4J_URI")
AUTH = (os.getenv("NEO4J_USERNAME"), os.getenv("NEO4J_PASSWORD"))

with GraphDatabase.driver(URI, auth=AUTH) as driver:
    with driver.session() as session:
        result = session.run("MATCH (l:Lesson) RETURN l.topic_id AS tid, l.order_index AS oid, l.title AS title LIMIT 5")
        for record in result:
            print(f"ID: {record['tid']}_{record['oid']} - {record['title']}")
