import { useState, useEffect } from "react";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, doc,
  updateDoc, increment, orderBy, query, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🔥 Firebase 연결 (냉장고 연결!)
const firebaseConfig = {
  apiKey: "AIzaSyDoUCfhBRHrkCYPX6yz0Qp-gMKjiV2STrM",
  authDomain: "choigawon-ba919.firebaseapp.com",
  projectId: "choigawon-ba919",
  storageBucket: "choigawon-ba919.firebasestorage.app",
  messagingSenderId: "970522987138",
  appId: "1:970522987138:web:16badca31115e63c83c29b",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CATEGORIES = ["전체", "직장인", "개발자", "일상", "연애/결혼", "정치", "스포츠"];

function timeAgo(timestamp) {
  if (!timestamp) return "방금 전";
  const now = new Date();
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

export default function App() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [showWrite, setShowWrite] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", content: "", category: "직장인" });
  const [newComment, setNewComment] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 📡 게시글 실시간으로 불러오기 (냉장고에서 꺼내기)
  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(data);
      setLoading(false);
      // 상세보기 중이면 해당 글도 업데이트
      if (selectedPost) {
        const updated = data.find(p => p.id === selectedPost.id);
        if (updated) setSelectedPost(updated);
      }
    });
    return () => unsub();
  }, []);

  // 💬 댓글 실시간으로 불러오기
  useEffect(() => {
    if (!selectedPost) return;
    const q = query(
      collection(db, "posts", selectedPost.id, "comments"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [selectedPost?.id]);

  // ✍️ 글 쓰기 (냉장고에 넣기)
  const handleWritePost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, "posts"), {
        ...newPost,
        likes: 0,
        views: 0,
        commentCount: 0,
        isHot: false,
        createdAt: serverTimestamp(),
      });
      setNewPost({ title: "", content: "", category: "직장인" });
      setShowWrite(false);
    } catch (e) {
      alert("글 등록 중 오류가 났어요 😢");
    }
    setSubmitting(false);
  };

  // 👍 좋아요
  const handleLike = async (postId) => {
    await updateDoc(doc(db, "posts", postId), { likes: increment(1) });
  };

  // 💬 댓글 등록
  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedPost) return;
    const author = `익명${Math.floor(Math.random() * 9000 + 1000)}`;
    await addDoc(collection(db, "posts", selectedPost.id, "comments"), {
      content: newComment,
      author,
      likes: 0,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "posts", selectedPost.id), { commentCount: increment(1) });
    setNewComment("");
  };

  const filtered = posts.filter(p => {
    const matchCat = selectedCategory === "전체" || p.category === selectedCategory;
    const matchSearch = p.title?.includes(searchQuery) || p.content?.includes(searchQuery);
    return matchCat && matchSearch;
  });

  return (
    <div style={{
      fontFamily: "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif",
      background: "#0f0f13",
      minHeight: "100vh",
      color: "#e8e8f0",
      maxWidth: 480,
      margin: "0 auto",
    }}>
      {/* 헤더 */}
      <div style={{
        background: "#16161d",
        borderBottom: "1px solid #2a2a38",
        padding: "16px 20px",
        position: "sticky", top: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {selectedPost && (
            <button onClick={() => { setSelectedPost(null); setComments([]); }} style={{
              background: "none", border: "none", color: "#a0a0c0",
              cursor: "pointer", fontSize: 20, padding: 0,
            }}>←</button>
          )}
          <span style={{ fontWeight: 800, fontSize: 20, color: "#fff", letterSpacing: "-0.5px" }}>
            {selectedPost ? selectedPost.category : "🙈 익명게시판"}
          </span>
        </div>
        {!selectedPost && (
          <button onClick={() => setShowWrite(true)} style={{
            background: "#5b5bf7", color: "#fff", border: "none",
            borderRadius: 20, padding: "7px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>글쓰기</button>
        )}
      </div>

      {/* 글쓰기 창 */}
      {showWrite && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          zIndex: 200, display: "flex", alignItems: "flex-end",
        }}>
          <div style={{
            background: "#1c1c26", borderRadius: "20px 20px 0 0",
            padding: 24, width: "100%", maxWidth: 480, margin: "0 auto",
          }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, color: "#fff" }}>새 글 작성</div>
            <select value={newPost.category} onChange={e => setNewPost(p => ({ ...p, category: e.target.value }))}
              style={{
                width: "100%", padding: "10px 12px", background: "#0f0f13",
                border: "1px solid #2a2a38", borderRadius: 10, color: "#e8e8f0",
                fontSize: 14, marginBottom: 10,
              }}>
              {CATEGORIES.filter(c => c !== "전체").map(c => <option key={c}>{c}</option>)}
            </select>
            <input placeholder="제목을 입력하세요" value={newPost.title}
              onChange={e => setNewPost(p => ({ ...p, title: e.target.value }))}
              style={{
                width: "100%", padding: "10px 12px", background: "#0f0f13",
                border: "1px solid #2a2a38", borderRadius: 10, color: "#e8e8f0",
                fontSize: 14, marginBottom: 10, boxSizing: "border-box",
              }} />
            <textarea placeholder="내용을 입력하세요" value={newPost.content}
              onChange={e => setNewPost(p => ({ ...p, content: e.target.value }))}
              rows={4} style={{
                width: "100%", padding: "10px 12px", background: "#0f0f13",
                border: "1px solid #2a2a38", borderRadius: 10, color: "#e8e8f0",
                fontSize: 14, marginBottom: 16, resize: "none", boxSizing: "border-box",
              }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowWrite(false)} style={{
                flex: 1, padding: "12px", background: "#2a2a38", border: "none",
                borderRadius: 10, color: "#a0a0c0", fontWeight: 600, cursor: "pointer", fontSize: 14,
              }}>취소</button>
              <button onClick={handleWritePost} disabled={submitting} style={{
                flex: 2, padding: "12px", background: submitting ? "#3a3a7a" : "#5b5bf7",
                border: "none", borderRadius: 10, color: "#fff", fontWeight: 700,
                cursor: submitting ? "not-allowed" : "pointer", fontSize: 14,
              }}>{submitting ? "등록 중..." : "등록하기"}</button>
            </div>
          </div>
        </div>
      )}

      {/* 게시글 상세보기 */}
      {selectedPost ? (
        <div style={{ padding: "0 0 100px" }}>
          <div style={{ padding: "20px 20px 0" }}>
            <span style={{
              background: "#2a2a50", color: "#8888ff", fontSize: 11,
              fontWeight: 700, padding: "3px 8px", borderRadius: 4,
            }}>{selectedPost.category}</span>
            <div style={{ fontWeight: 800, fontSize: 18, marginTop: 10, lineHeight: 1.4, color: "#fff" }}>
              {selectedPost.title}
            </div>
            <div style={{ color: "#606080", fontSize: 12, marginTop: 6 }}>
              익명 · {timeAgo(selectedPost.createdAt)} · 조회 {selectedPost.views || 0}
            </div>
            <div style={{
              marginTop: 16, fontSize: 15, lineHeight: 1.7, color: "#c8c8e0",
              paddingBottom: 20, borderBottom: "1px solid #2a2a38",
            }}>
              {selectedPost.content}
            </div>
            <div style={{ display: "flex", gap: 16, padding: "16px 0", borderBottom: "1px solid #2a2a38" }}>
              <button onClick={() => handleLike(selectedPost.id)} style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "none", border: "1px solid #2a2a38",
                borderRadius: 20, padding: "7px 16px", cursor: "pointer",
                color: "#606080", fontSize: 13, fontWeight: 600,
              }}>👍 {selectedPost.likes || 0}</button>
              <span style={{ color: "#606080", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                💬 {comments.length}
              </span>
            </div>
          </div>

          {/* 댓글 목록 */}
          <div style={{ padding: "0 20px" }}>
            {comments.length === 0 && (
              <div style={{ textAlign: "center", color: "#404060", padding: "30px 0", fontSize: 13 }}>
                첫 댓글을 달아보세요 😊
              </div>
            )}
            {comments.map(c => (
              <div key={c.id} style={{ padding: "14px 0", borderBottom: "1px solid #1e1e2a" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#a0a0c8" }}>{c.author}</span>
                  <span style={{ color: "#404060", fontSize: 11 }}>{timeAgo(c.createdAt)}</span>
                </div>
                <div style={{ fontSize: 14, color: "#c0c0d8", lineHeight: 1.6 }}>{c.content}</div>
              </div>
            ))}
          </div>

          {/* 댓글 입력창 */}
          <div style={{
            position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
            width: "100%", maxWidth: 480, background: "#16161d",
            borderTop: "1px solid #2a2a38", padding: "12px 16px",
            display: "flex", gap: 10, boxSizing: "border-box",
          }}>
            <input placeholder="익명으로 댓글 달기..." value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddComment()}
              style={{
                flex: 1, padding: "10px 14px", background: "#0f0f13",
                border: "1px solid #2a2a38", borderRadius: 20, color: "#e8e8f0",
                fontSize: 14, outline: "none",
              }} />
            <button onClick={handleAddComment} style={{
              background: "#5b5bf7", border: "none", borderRadius: 20,
              padding: "10px 16px", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13,
            }}>등록</button>
          </div>
        </div>
      ) : (
        <>
          {/* 검색창 */}
          <div style={{ padding: "12px 16px 0" }}>
            <input placeholder="🔍  검색어를 입력하세요" value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: "100%", padding: "10px 14px", background: "#1c1c26",
                border: "1px solid #2a2a38", borderRadius: 10, color: "#e8e8f0",
                fontSize: 14, boxSizing: "border-box", outline: "none",
              }} />
          </div>

          {/* 카테고리 */}
          <div style={{ display: "flex", gap: 8, padding: "12px 16px", overflowX: "auto" }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} style={{
                padding: "6px 14px", borderRadius: 20, border: "none",
                background: selectedCategory === cat ? "#5b5bf7" : "#1c1c26",
                color: selectedCategory === cat ? "#fff" : "#808099",
                fontWeight: selectedCategory === cat ? 700 : 500,
                cursor: "pointer", fontSize: 13, whiteSpace: "nowrap",
              }}>{cat}</button>
            ))}
          </div>

          {/* 게시글 목록 */}
          <div style={{ padding: "0 16px 80px" }}>
            {loading && (
              <div style={{ textAlign: "center", color: "#404060", padding: "60px 0", fontSize: 14 }}>
                불러오는 중... ⏳
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div style={{ textAlign: "center", color: "#404060", padding: "60px 0", fontSize: 14 }}>
                게시글이 없어요 😢<br />
                <span style={{ fontSize: 12, marginTop: 8, display: "block" }}>첫 글을 써보세요!</span>
              </div>
            )}
            {filtered.map(post => (
              <div key={post.id} onClick={() => setSelectedPost(post)} style={{
                background: "#16161d", borderRadius: 12, padding: "16px",
                marginBottom: 10, cursor: "pointer", border: "1px solid #2a2a38",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <span style={{
                    background: "#2a2a50", color: "#8888ff", fontSize: 11,
                    fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                  }}>{post.category}</span>
                  {(post.likes || 0) >= 50 && (
                    <span style={{
                      background: "#3a1a1a", color: "#ff6b6b", fontSize: 11,
                      fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                    }}>🔥 HOT</span>
                  )}
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#e8e8f0", marginBottom: 6, lineHeight: 1.4 }}>
                  {post.title}
                </div>
                <div style={{
                  color: "#707090", fontSize: 13, marginBottom: 10, lineHeight: 1.5,
                  overflow: "hidden", display: "-webkit-box",
                  WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                }}>
                  {post.content}
                </div>
                <div style={{ display: "flex", gap: 14, color: "#505070", fontSize: 12 }}>
                  <span>👍 {post.likes || 0}</span>
                  <span>💬 {post.commentCount || 0}</span>
                  <span style={{ marginLeft: "auto" }}>{timeAgo(post.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
