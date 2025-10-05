import axios from 'axios';

interface EmailConfig {
  apiKey: string;
  baseURL: string;
  fromEmail: string;
  fromName: string;
}