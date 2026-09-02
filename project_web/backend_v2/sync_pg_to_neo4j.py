import sys
import os
import json
import re
from neo4j import GraphDatabase
from dotenv import load_dotenv

# Load .env file
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# Neo4j credentials
NEO4J_URI = os.getenv("NEO4J_URI", "neo4j+s://4dd80172.databases.neo4j.io")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "")
NEO4J_AUTH = (NEO4J_USER, NEO4J_PASSWORD)

MOCK_FILE_PATH = os.path.join(
    os.path.dirname(__file__),
    "..",
    "frontend_v2",
    "js",
    "mock_library.js"
)

def extract_json_from_js(filepath):
    print(f"Reading {filepath}...")
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    start_idx = content.find('{')
    end_idx = content.rfind('}')
    if start_idx != -1 and end_idx != -1:
        json_str = content[start_idx:end_idx+1]
    else:
        raise ValueError("Could not extract JSON from JS file.")

    return json.loads(json_str)

def sync_lessons_to_neo4j():
    data = extract_json_from_js(MOCK_FILE_PATH)
    topics = data.get("topics", [])
    graph = data.get("graph", {})
    edges = graph.get("edges", [])

    print(f"Connecting to Neo4j at {NEO4J_URI}...")
    neo4j_driver = GraphDatabase.driver(NEO4J_URI, auth=NEO4J_AUTH)
    
    try:
        neo4j_driver.verify_connectivity()
    except Exception as e:
        print(f"Failed to connect to Neo4j: {e}")
        return

    # Extract all lessons
    lessons_data = []
    for t in topics:
        topic_id = t["id"]
        topic_title = t["title"]
        
        for s in t.get("sections", []):
            for l in s.get("lessons", []):
                lessons_data.append({
                    "id": l["id"],
                    "title": l["title"],
                    "topic_id": topic_id,
                    "topic_title": topic_title,
                    "order_index": l["num"]
                })

    print(f"Prepared {len(lessons_data)} lessons and {len(edges)} edges.")

    def clear_db(tx):
        print("Clearing Neo4j database...")
        tx.run("MATCH (n:Lesson) DETACH DELETE n")

    def create_nodes(tx, lessons_batch):
        print("Creating Lesson nodes...")
        query = """
        UNWIND $batch AS lesson
        MERGE (n:Lesson {id: lesson.id})
        SET n.title = lesson.title,
            n.topic_id = lesson.topic_id,
            n.topic_title = lesson.topic_title,
            n.order_index = lesson.order_index
        """
        tx.run(query, batch=lessons_batch)

    def create_edges(tx, edges_batch):
        print("Creating relationships...")
        query = """
        UNWIND $batch AS edge
        MATCH (a:Lesson {id: edge.from}), (b:Lesson {id: edge.to})
        MERGE (a)-[:REQUIRES]->(b)
        """
        tx.run(query, batch=edges_batch)

    with neo4j_driver.session() as session:
        # 1. Clear database
        session.execute_write(clear_db)
        
        # 2. Add Constraint
        try:
            session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (l:Lesson) REQUIRE l.id IS UNIQUE")
        except Exception:
            pass
            
        # 3. Create Nodes
        session.execute_write(create_nodes, lessons_data)
        
        # 4. Create Edges
        session.execute_write(create_edges, edges)

    print("Neo4j Sync Complete!")

if __name__ == "__main__":
    sync_lessons_to_neo4j()
