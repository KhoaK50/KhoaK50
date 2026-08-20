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
    # Lấy tất cả Lesson chưa có difficulty_level (hoặc cập nhật toàn bộ)
    result = session.run("MATCH (l:Lesson) RETURN id(l) as node_id")
    node_ids = [record["node_id"] for record in result]
    
    updated_count = 0
    for nid in node_ids:
        # random values
        diff = random.choice([1.0, 1.5, 2.0, 2.5, 3.0, 3.5])
        time_spent = random.randint(10, 45) # 10 to 45 mins
        bloom = bloom_mapping[diff]
        
        # update
        session.run(
            '''
            MATCH (l:Lesson) WHERE id(l) = 
            SET l.difficulty_level = ,
                l.estimated_time = ,
                l.bloom_level = 
            ''',
            nid=nid, diff=diff, time_spent=time_spent, bloom=bloom
        )
        updated_count += 1

print(f"Successfully updated {updated_count} lessons with random Bloom levels and Times!")
