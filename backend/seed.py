from app.database import SessionLocal, engine, Base
from app import models
import uuid

def seed():
    # Base.metadata.drop_all(bind=engine)
    # Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # 1. Create Default User
    DEFAULT_USER_ID = "test-user-id"
    user = db.query(models.User).filter(models.User.id == DEFAULT_USER_ID).first()
    if not user:
        user = models.User(id=DEFAULT_USER_ID, name="Jane Doe", email="jane@example.com")
        db.add(user)
        db.commit()

    # 2. Create a Published Form
    form_id = str(uuid.uuid4())
    form = models.Form(
        id=form_id, 
        creator_id=DEFAULT_USER_ID, 
        title="Customer Feedback Survey", 
        status="published"
    )
    db.add(form)

    # 3. Add Questions
    q1_id = str(uuid.uuid4())
    q1 = models.Question(
        id=q1_id, form_id=form_id, type="short_text", title="What's your name?",
        description="Please provide your full name.", is_required=True, order_index=0
    )
    
    q2_id = str(uuid.uuid4())
    q2 = models.Question(
        id=q2_id, form_id=form_id, type="multiple_choice", title="How did you hear about us?",
        description="Select one option.", is_required=True, order_index=1,
        options=["Social Media", "Friend", "Search Engine", "Other"]
    )
    
    q3_id = str(uuid.uuid4())
    q3 = models.Question(
        id=q3_id, form_id=form_id, type="yes_no", title="Would you recommend us?",
        description="", is_required=False, order_index=2
    )

    db.add_all([q1, q2, q3])
    db.commit()

    # 4. Add Dummy Responses
    for i in range(3):
        r_id = str(uuid.uuid4())
        response = models.Response(id=r_id, form_id=form_id)
        db.add(response)
        db.flush()

        a1 = models.Answer(response_id=r_id, question_id=q1_id, value=f"Test User {i+1}")
        a2 = models.Answer(response_id=r_id, question_id=q2_id, value="Social Media" if i % 2 == 0 else "Friend")
        a3 = models.Answer(response_id=r_id, question_id=q3_id, value="Yes")
        db.add_all([a1, a2, a3])

    db.commit()
    db.close()
    print("Seed data successfully injected into the database!")

if __name__ == "__main__":
    seed()
