from neo4j import GraphDatabase

URI = "neo4j+s://4dd80172.databases.neo4j.io"
AUTH = ("4dd80172", "V7LbjDyESk03bsWOMOZx6in4plhZuIuuHH4Of1o2aLA")

driver = GraphDatabase.driver(URI, auth=AUTH)

with driver.session() as session:
    result = session.run("MATCH (n:Lesson) RETURN count(n) as count")
    print("Total Lesson nodes:", result.single()["count"])
    
    result2 = session.run("MATCH ()-[r:REQUIRES]->() RETURN count(r) as count")
    print("Total REQUIRES relationships:", result2.single()["count"])

    result3 = session.run("MATCH (l:Lesson) RETURN l.topic_id, l.order_index, l.title, l.difficulty_level LIMIT 5")
    print("First 5 lessons:")
    for record in result3:
        print(dict(record))
