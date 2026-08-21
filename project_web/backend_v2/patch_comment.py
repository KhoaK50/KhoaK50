import re
import threading
with open('D:/Programming_language/project_web/backend_v2/vectoria_api/routes/comment.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the new logic to replace the synchronous profanity check
old_code = """        # Profanity Masking
        masked_content, is_flagged, reason, severity = check_profanity_and_mask(content)
        
        query = \"\"\"
            INSERT INTO lesson_comments (user_id, topic_id, order_index, content, parent_comment_id, upvote_count)
            VALUES (%s, %s, %s, %s, %s, 0)
            RETURNING id, created_at;
        \"\"\"
        cursor.execute(query, (user_id, topic_id, order_index, masked_content, parent_id))
        result = cursor.fetchone()
        
        # If flagged, insert into flagged_comments
        if is_flagged:
            ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
            if ip_address:
                ip_address = ip_address.split(',')[0].strip()
            
            flag_query = \"\"\"
                INSERT INTO flagged_comments (comment_id, original_content, ai_severity_score, ai_reason, ip_address)
                VALUES (%s, %s, %s, %s, %s);
            \"\"\"
            cursor.execute(flag_query, (result['id'], content, severity, reason, ip_address))
            
            # Create a notification for the user
            notif_query = \"\"\"
                INSERT INTO notifications (user_id, type, title, message)
                VALUES (%s, 'WARNING', 'Cảnh báo vi phạm nội dung', 'Bình luận của bạn chứa từ ngữ không phù hợp và đã bị ẩn một phần. Vui lòng tuân thủ quy tắc cộng đồng.')
            \"\"\"
            cursor.execute(notif_query, (user_id,))
            
        conn.commit()"""

new_code = """        # Insert original comment first to avoid blocking the user
        query = \"\"\"
            INSERT INTO lesson_comments (user_id, topic_id, order_index, content, parent_comment_id, upvote_count)
            VALUES (%s, %s, %s, %s, %s, 0)
            RETURNING id, created_at;
        \"\"\"
        cursor.execute(query, (user_id, topic_id, order_index, content, parent_id))
        result = cursor.fetchone()
        comment_id = result['id']
        conn.commit()
        
        # Get IP before spawning thread
        ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
        if ip_address:
            ip_address = ip_address.split(',')[0].strip()
            
        def background_profanity_check(c_id, orig_content, u_id, ip_addr):
            import psycopg2
            from vectoria_api.config import DB_URL
            try:
                local_conn = psycopg2.connect(DB_URL)
                local_cursor = local_conn.cursor()
                
                masked_content, is_flagged, reason, severity = check_profanity_and_mask(orig_content)
                
                if is_flagged or masked_content != orig_content:
                    local_cursor.execute("UPDATE lesson_comments SET content = %s WHERE id = %s", (masked_content, c_id))
                    
                if is_flagged:
                    flag_query = \"\"\"
                        INSERT INTO flagged_comments (comment_id, original_content, ai_severity_score, ai_reason, ip_address)
                        VALUES (%s, %s, %s, %s, %s);
                    \"\"\"
                    local_cursor.execute(flag_query, (c_id, orig_content, severity, reason, ip_addr))
                    
                    notif_query = \"\"\"
                        INSERT INTO notifications (user_id, type, title, message)
                        VALUES (%s, 'WARNING', 'Cảnh báo vi phạm nội dung', 'Bình luận của bạn chứa từ ngữ không phù hợp và đã bị ẩn một phần. Vui lòng tuân thủ quy tắc cộng đồng.')
                    \"\"\"
                    local_cursor.execute(notif_query, (u_id,))
                    
                local_conn.commit()
            except Exception as e:
                if 'local_conn' in locals(): local_conn.rollback()
                print(f"Background profanity check failed: {e}")
            finally:
                if 'local_cursor' in locals(): local_cursor.close()
                if 'local_conn' in locals(): local_conn.close()
                
        # Start thread
        import threading
        t = threading.Thread(target=background_profanity_check, args=(comment_id, content, user_id, ip_address))
        t.start()"""

content = content.replace(old_code, new_code)
with open('D:/Programming_language/project_web/backend_v2/vectoria_api/routes/comment.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated comment.py")
