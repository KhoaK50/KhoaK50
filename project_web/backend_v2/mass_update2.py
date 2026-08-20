from neo4j import GraphDatabase
import random

URI = "neo4j+s://4dd80172.databases.neo4j.io"
AUTH = ("4dd80172", "V7LbjDyESk03bsWOMOZx6in4plhZuIuuHH4Of1o2aLA")

driver = GraphDatabase.driver(URI, auth=AUTH)

bloom_mapping = {
    1.0: 'Remembering',
    1.5: 'Understanding',
    2.0: 'Applying',
    2.5: 'Analyzing',
    3.0: 'Evaluating',
    3.5: 'Creating'
}

with driver.session() as session:
    result = session.run("MATCH (l:Lesson) RETURN elementId(l) as node_id")
    node_ids = [record["node_id"] for record in result]
    
    updated_count = 0
    for nid in node_ids:
        diff = random.choice([1.0, 1.5, 2.0, 2.5, 3.0, 3.5])
        time_spent = random.randint(10, 45)
        bloom = bloom_mapping[diff]
        
        session.run(
            """
            MATCH (l:Lesson) WHERE elementId(l) = $nid
            SET l.difficulty_level = $diff,
                l.estimated_time = $time_spent,
                l.bloom_level = $bloom
            """,
            nid=nid, diff=diff, time_spent=time_spent, bloom=bloom
        )
        updated_count += 1

print(f"Successfully updated {updated_count} lessons with random Bloom levels and Times!")
