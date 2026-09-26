from datetime import datetime
from uuid import UUID
from pydantic import BaseModel
from app.schemas.iceberg import Provenance
class Availability(BaseModel): domain:str;count:int;statuses:dict[str,int]
class DashboardResponse(BaseModel): availability:list[Availability];activeAlerts:int;provenanceNote:str
class ReportRequest(BaseModel): routeId:str|None=None
class ReportResponse(BaseModel): id:str;databaseId:UUID;reportType:str;title:str;sections:dict;limitations:str;createdAt:datetime;provenance:Provenance
class ChatRequest(BaseModel): message:str
class ChatResponse(BaseModel): answer:str;dataStatus:str;limitations:str
