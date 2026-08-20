from neo4j import GraphDatabase

URI = "neo4j+s://4dd80172.databases.neo4j.io"
AUTH = ("4dd80172", "V7LbjDyESk03bsWOMOZx6in4plhZuIuuHH4Of1o2aLA")

driver = GraphDatabase.driver(URI, auth=AUTH)

queries = [
    # Cập nhật hoặc tạo Lesson 1
    '''
    MERGE (l1:Lesson {topic_id: 't1', order_index: 1})
    SET l1.title = 'Khái niệm vector, phương, hướng và độ dài',
        l1.difficulty_level = 1.0,
        l1.estimated_time = 15,
        l1.bloom_level = 'Remembering'
    ''',
    # Cập nhật hoặc tạo Lesson 2
    '''
    MERGE (l2:Lesson {topic_id: 't1', order_index: 2})
    SET l2.title = 'Phép cộng, trừ vector và nhân vector với một số',
        l2.difficulty_level = 1.5,
        l2.estimated_time = 20,
        l2.bloom_level = 'Understanding'
    ''',
    # Cập nhật hoặc tạo Lesson 3
    '''
    MERGE (l3:Lesson {topic_id: 't1', order_index: 3})
    SET l3.title = 'Biểu diễn tọa độ của vector trong không gian 2D và 3D',
        l3.difficulty_level = 2.0,
        l3.estimated_time = 30,
        l3.bloom_level = 'Applying'
    ''',
    # Tạo mối quan hệ REQUIRE
    '''
    MATCH (l1:Lesson {topic_id: 't1', order_index: 1}), (l2:Lesson {topic_id: 't1', order_index: 2})
    MERGE (l2)-[:REQUIRES]->(l1)
    ''',
    '''
    MATCH (l2:Lesson {topic_id: 't1', order_index: 2}), (l3:Lesson {topic_id: 't1', order_index: 3})
    MERGE (l3)-[:REQUIRES]->(l2)
    '''
]

with driver.session() as session:
    for q in queries:
        session.run(q)

print("Seed Data successfully injected!")
