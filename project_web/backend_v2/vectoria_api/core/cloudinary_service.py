import os
import cloudinary
import cloudinary.uploader

# Configuration will automatically read from environment variables:
# CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
# Make sure these are loaded via dotenv in config.py or main entry point

def upload_avatar_to_cloudinary(file_stream, user_id):
    """
    Uploads an avatar image to Cloudinary and overwrites any existing image for this user.
    Uses vectoria_avatars folder and user_{id} public_id.
    """
    try:
        # Crop to a 256x256 square focusing on the face, optimizing format and quality
        result = cloudinary.uploader.upload(
            file_stream,
            folder="vectoria_avatars",
            public_id=f"user_{user_id}",
            overwrite=True,
            invalidate=True,
            transformation=[
                {"width": 256, "height": 256, "gravity": "face", "crop": "fill"},
                {"fetch_format": "auto", "quality": "auto"}
            ]
        )
        return result.get("secure_url")
    except Exception as e:
        print(f"Cloudinary Upload Error: {e}")
        return None
