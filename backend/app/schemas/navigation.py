from datetime import datetime
from typing import Literal
from uuid import UUID
from pydantic import BaseModel, Field
from app.schemas.iceberg import LatLon, Provenance

class Waypoint(BaseModel): lat:float; lon:float; label:str|None=None
class RouteResponse(BaseModel):
 id:str; databaseId:UUID; name:str; objective:Literal['shortest','balanced','safety']; distanceKm:float|None=None; timeHours:float|None=None; fuelLiters:float|None=None; iceRisk:str|None=None; icebergRisk:str|None=None; recommendedFor:str|None=None; waypoints:list[Waypoint]; conflictAtKm:float|None=None; hasConflict:bool; provenance:Provenance
class RoutePage(BaseModel): items:list[RouteResponse];limit:int;offset:int;total:int
class RouteRequest(BaseModel): origin:LatLon;destination:LatLon;objective:Literal['shortest','balanced','safety']='balanced'
class Factor(BaseModel): name:str; status:str; value:str|float|None=None; explanation:str
class RiskResponse(BaseModel): id:UUID|None=None; method:str; riskLevel:str|None=None; score:float|None=None; factors:list[Factor]; limitations:str; provenance:Provenance
class RiskRequest(BaseModel): routeId:str|None=None; vesselId:str|None=None
class AlertResponse(BaseModel): id:str;databaseId:UUID;category:str;severity:str;title:str;message:str;relatedEntityType:str|None=None;relatedEntityId:str|None=None;triggerContext:dict;createdAt:datetime;acknowledged:bool;acknowledgedAt:datetime|None=None;provenance:Provenance
class AlertPage(BaseModel):items:list[AlertResponse];limit:int;offset:int;total:int
