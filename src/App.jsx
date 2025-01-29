import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import abi from "./abi.json";
import "./App.css";

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

const App = () => {
  const [account, setAccount] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskText, setTaskText] = useState("");
  const [updateTrigger, setUpdateTrigger] = useState(false);

  useEffect(() => {
    checkWalletConnection();
  }, []);

  useEffect(() => {
    if (account) {
      fetchTasks();
      listenForEvents();
    }
  }, [account, updateTrigger]);

  const showSuccess = (message) => toast.success(message);
  const showError = (message) => toast.error(message);

  async function checkWalletConnection() {
    if (!window.ethereum) {
      showError("MetaMask is required to use this app.");
      return;
    }
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.listAccounts();
    if (accounts.length > 0) {
      setAccount(accounts[0].address);
    }
  }

  async function connectWallet() {
    if (!window.ethereum) {
      showError("MetaMask is required to use this app.");
      return;
    }
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    setAccount(accounts[0]);
  }

  function getContract(signerOrProvider) {
    return new ethers.Contract(contractAddress, abi, signerOrProvider);
  }

  async function fetchTasks() {
    if (!window.ethereum || !account) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = getContract(provider);

      console.log("📡 Fetching tasks from contract...");

      const myTasks = await contract.getMyTasks(); 

      console.log("📋 Raw tasks from blockchain:", myTasks);

      const formattedTasks = myTasks
        .filter(task => !task.isDeleted) 
        .map(task => ({
          id: task.id.toString(),
          taskTitle: task.taskTitle,
          taskText: task.taskText,
        }));

      console.log("✅ Tasks formatted:", formattedTasks);

      setTasks([...formattedTasks]);
    } catch (error) {
      console.error("🚨 Error fetching tasks:", error);
      showError("Failed to fetch tasks.");
    }
  }

  async function addTask(event) {
    event.preventDefault();

    if (!window.ethereum || !taskTitle || !taskText) {
      showError("Task Title and Task Description are required.");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = getContract(signer);

      console.log("📢 Sending transaction...");

      const tx = await contract.addTask(taskText, taskTitle, false);
      await tx.wait();

      console.log("✅ Task added. Fetching tasks...");
      showSuccess("Task added successfully!");

      setTaskTitle("");
      setTaskText("");

      setUpdateTrigger(prev => !prev); 
    } catch (error) {
      console.error("🚨 Error adding task:", error);
      showError("Failed to add task.");
    }
  }

  async function deleteTask(taskId) {
    if (!window.ethereum) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = getContract(signer);

      const tx = await contract.deleteTask(taskId);
      await tx.wait();

      showSuccess("Task deleted successfully!");
      setUpdateTrigger(prev => !prev); 
    } catch (error) {
      showError("Failed to delete task.");
    }
  }

  function listenForEvents() {
    if (!window.ethereum) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = getContract(provider);

      contract.on("TaskAdded", (taskId, taskTitle, taskText, event) => {
        console.log("📢 Task Added Event:", { taskId, taskTitle, taskText });
        setUpdateTrigger(prev => !prev);
      });

      contract.on("TaskDeleted", (taskId, event) => {
        console.log("🗑️ Task Deleted Event:", taskId);
        setUpdateTrigger(prev => !prev);
      });

      return () => {
        contract.removeAllListeners("TaskAdded");
        contract.removeAllListeners("TaskDeleted");
      };
    } catch (error) {
      console.error("🚨 Error setting up event listeners:", error);
    }
  }

  return (
    <div className="app-container">
      <h1 className="app-title">CeCe Task Manager DApp</h1>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />

      <p className="wallet-info">
        {account ? `Connected Wallet: ${account}` : "Not Connected"}
      </p>

      {!account ? (
        <button className="btn connect-btn" onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <button className="btn disconnect-btn" onClick={() => setAccount(null)}>Disconnect Wallet</button>
      )}

      <h2 className="task-heading">Add Task</h2>
      <form className="form" onSubmit={addTask}>
        <input
          className="input-field"
          type="text"
          placeholder="Task Title"
          value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)}
        />
        <input
          className="input-field"
          type="text"
          placeholder="Task Description"
          value={taskText}
          onChange={(e) => setTaskText(e.target.value)}
        />
        <button className="btn submit-btn" type="submit">Add Task</button>
      </form>

      <h2 className="task-heading">My Tasks</h2>
      {tasks.length === 0 ? (
        <p className="no-tasks">No tasks found. Add a task to get started!</p>
      ) : (
        <ul className="task-list">
          {tasks.map((task, index) => (
            <li key={index} className="task-item">
              <span className="task-title">{task.taskTitle}</span>
              <p className="task-text">{task.taskText}</p>
              <button className="btn delete-btn" onClick={() => deleteTask(task.id)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default App;
